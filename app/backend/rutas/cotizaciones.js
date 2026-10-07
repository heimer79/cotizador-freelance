const express = require('express');
const { siguienteNumero } = require('../numeracion');
const { calcularCotizacion, validarRetencion, TARIFAS_IVA } = require('../calculo');

const VIGENCIA_DIAS = 30;

function obtenerLineas(db, cotizacionId) {
  return db
    .prepare(
      `SELECT id, descripcion, cantidad, precio_unitario AS precioUnitario, origen, servicio_id AS servicioId
       FROM lineas_cotizacion WHERE cotizacion_id = ? ORDER BY id`
    )
    .all(cotizacionId);
}

function construirCotizacion(db, fila) {
  const lineas = obtenerLineas(db, fila.id);
  const totales = calcularCotizacion({
    lineas,
    ivaTarifa: fila.iva_tarifa,
    retencionActivada: !!fila.retencion_activada,
    retencionPorcentaje: fila.retencion_porcentaje || 0
  });

  return {
    id: fila.id,
    numero: fila.numero,
    estado: fila.estado,
    fechaEmision: fila.fecha_emision,
    fechaVigencia: fila.fecha_vigencia,
    cliente: {
      id: fila.cliente_id,
      nombre: fila.cliente_nombre,
      documento: fila.cliente_documento,
      contacto: fila.cliente_contacto,
      tipo: fila.cliente_tipo,
      agenteRetenedor: !!fila.cliente_agente_retenedor
    },
    emisor: {
      nombre: fila.emisor_nombre,
      documento: fila.emisor_documento,
      contacto: fila.emisor_contacto,
      regimen: fila.emisor_regimen,
      logoBase64: fila.emisor_logo_base64
    },
    ivaTarifa: fila.iva_tarifa,
    retencion: {
      activada: !!fila.retencion_activada,
      concepto: fila.retencion_concepto,
      porcentaje: fila.retencion_porcentaje
    },
    lineas,
    totales
  };
}

function sumarDias(fecha, dias) {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function formatoFecha(fecha) {
  return fecha.toISOString().slice(0, 10);
}

function validarLinea(body) {
  const { cantidad, precioUnitario } = body;
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return 'La cantidad debe ser un número entero mayor o igual a 1';
  }
  if (!Number.isInteger(precioUnitario) || precioUnitario <= 0) {
    return 'El precio unitario debe ser un número entero mayor que cero';
  }
  return null;
}

// Lee la configuración de IVA y retención del body, o devuelve el error de validación.
function leerConfiguracionFiscal(body, cliente) {
  const ivaTarifa = body.ivaTarifa === undefined ? 19 : body.ivaTarifa;
  if (!TARIFAS_IVA.includes(ivaTarifa)) {
    return { error: 'La tarifa de IVA debe ser 19 %, 5 % o 0 % (excluido)' };
  }

  const retencion = body.retencion || {};
  const activada = !!retencion.activada;
  const error = validarRetencion({
    tipoCliente: cliente.tipo,
    agenteRetenedor: !!cliente.agente_retenedor,
    activada,
    concepto: retencion.concepto,
    porcentaje: retencion.porcentaje
  });
  if (error) return { error };

  return {
    valor: {
      ivaTarifa,
      retencionActivada: activada ? 1 : 0,
      retencionConcepto: activada ? retencion.concepto : null,
      retencionPorcentaje: activada ? retencion.porcentaje : null
    }
  };
}

function obtenerCotizacion(db, id, usuarioId) {
  return db.prepare('SELECT * FROM cotizaciones WHERE id = ? AND usuario_id = ?').get(id, usuarioId);
}

function obtenerCliente(db, clienteId, usuarioId) {
  return db.prepare('SELECT * FROM clientes WHERE id = ? AND usuario_id = ?').get(clienteId, usuarioId);
}

// Copia de los datos del emisor. Se refresca mientras es borrador; una cotización emitida conserva la suya (FR-016).
function datosEmisor(db, usuarioId) {
  const perfil = db.prepare('SELECT * FROM perfil WHERE usuario_id = ?').get(usuarioId) || {};
  return {
    emisor_nombre: perfil.nombre || null,
    emisor_documento: perfil.nit || null,
    emisor_contacto: perfil.contacto || null,
    emisor_regimen: perfil.regimen || null,
    emisor_logo_base64: perfil.logo_base64 || null
  };
}

function crearRutasCotizaciones(db) {
  const router = express.Router();

  function responderCotizacion(res, id, codigo = 200) {
    const fila = db.prepare('SELECT * FROM cotizaciones WHERE id = ?').get(id);
    res.status(codigo).json(construirCotizacion(db, fila));
  }

  router.get('/', (req, res) => {
    const filas = db
      .prepare('SELECT * FROM cotizaciones WHERE usuario_id = ? ORDER BY id DESC')
      .all(req.usuario.id);
    res.json(
      filas.map((fila) => {
        const completa = construirCotizacion(db, fila);
        return {
          id: completa.id,
          numero: completa.numero,
          estado: completa.estado,
          fechaEmision: completa.fechaEmision,
          cliente: { nombre: completa.cliente.nombre, tipo: completa.cliente.tipo },
          total: completa.totales.total
        };
      })
    );
  });

  router.get('/:id', (req, res) => {
    const fila = obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    res.json(construirCotizacion(db, fila));
  });

  router.post('/', (req, res) => {
    const cliente = obtenerCliente(db, req.body.clienteId, req.usuario.id);
    if (!cliente) return res.status(400).json({ error: 'El cliente indicado no existe' });

    const fiscal = leerConfiguracionFiscal(req.body, cliente);
    if (fiscal.error) return res.status(422).json({ error: fiscal.error });

    const ahora = new Date();
    const cotizacionId = db
      .transaction(() => {
        const numero = siguienteNumero(db, req.usuario.id, ahora);
        const resultado = db
          .prepare(
            `INSERT INTO cotizaciones (
              usuario_id, numero, estado, fecha_emision, fecha_vigencia,
              cliente_id, cliente_nombre, cliente_documento, cliente_contacto, cliente_tipo, cliente_agente_retenedor,
              emisor_nombre, emisor_documento, emisor_contacto, emisor_regimen, emisor_logo_base64,
              iva_tarifa, retencion_activada, retencion_concepto, retencion_porcentaje
            ) VALUES (?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            req.usuario.id,
            numero,
            formatoFecha(ahora),
            formatoFecha(sumarDias(ahora, VIGENCIA_DIAS)),
            cliente.id,
            cliente.nombre,
            cliente.documento,
            cliente.contacto,
            cliente.tipo,
            cliente.agente_retenedor,
            ...Object.values(datosEmisor(db, req.usuario.id)),
            fiscal.valor.ivaTarifa,
            fiscal.valor.retencionActivada,
            fiscal.valor.retencionConcepto,
            fiscal.valor.retencionPorcentaje
          );
        return resultado.lastInsertRowid;
      })();

    responderCotizacion(res, cotizacionId, 201);
  });

  // Solo los borradores son editables (FR-014a).
  router.put('/:id', (req, res) => {
    const fila = obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (fila.estado === 'emitida') {
      return res.status(409).json({ error: 'Esta cotización está emitida y no se puede modificar' });
    }

    const cliente = req.body.clienteId !== undefined
      ? obtenerCliente(db, req.body.clienteId, req.usuario.id)
      : { id: fila.cliente_id, nombre: fila.cliente_nombre, documento: fila.cliente_documento, contacto: fila.cliente_contacto, tipo: fila.cliente_tipo, agente_retenedor: fila.cliente_agente_retenedor };
    if (!cliente) return res.status(400).json({ error: 'El cliente indicado no existe' });

    const fiscal = leerConfiguracionFiscal(
      { ivaTarifa: req.body.ivaTarifa ?? fila.iva_tarifa, retencion: req.body.retencion ?? {
        activada: !!fila.retencion_activada, concepto: fila.retencion_concepto, porcentaje: fila.retencion_porcentaje
      } },
      cliente
    );
    if (fiscal.error) return res.status(422).json({ error: fiscal.error });

    db.prepare(
      `UPDATE cotizaciones SET
        cliente_id = ?, cliente_nombre = ?, cliente_documento = ?, cliente_contacto = ?, cliente_tipo = ?, cliente_agente_retenedor = ?,
        iva_tarifa = ?, retencion_activada = ?, retencion_concepto = ?, retencion_porcentaje = ?,
        emisor_nombre = ?, emisor_documento = ?, emisor_contacto = ?, emisor_regimen = ?, emisor_logo_base64 = ?
       WHERE id = ?`
    ).run(
      cliente.id,
      cliente.nombre,
      cliente.documento,
      cliente.contacto,
      cliente.tipo,
      cliente.agente_retenedor,
      fiscal.valor.ivaTarifa,
      fiscal.valor.retencionActivada,
      fiscal.valor.retencionConcepto,
      fiscal.valor.retencionPorcentaje,
      ...Object.values(datosEmisor(db, req.usuario.id)),
      fila.id
    );

    responderCotizacion(res, fila.id);
  });

  // Emitir la cotización la vuelve de solo lectura y fija su fecha de emisión y vigencia (FR-014b).
  router.post('/:id/emitir', (req, res) => {
    const fila = obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (fila.estado === 'emitida') return res.status(409).json({ error: 'La cotización ya está emitida' });

    if (obtenerLineas(db, fila.id).length === 0) {
      return res.status(422).json({ error: 'Agrega al menos una línea antes de emitir la cotización' });
    }

    const ahora = new Date();
    db.prepare(
      `UPDATE cotizaciones SET estado = 'emitida', fecha_emision = ?, fecha_vigencia = ? WHERE id = ?`
    ).run(formatoFecha(ahora), formatoFecha(sumarDias(ahora, VIGENCIA_DIAS)), fila.id);

    responderCotizacion(res, fila.id);
  });

  // Solo se eliminan borradores; el número consumido no se reutiliza (FR-014c).
  router.delete('/:id', (req, res) => {
    const fila = obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (fila.estado === 'emitida') {
      return res.status(409).json({ error: 'Las cotizaciones emitidas no se pueden eliminar' });
    }
    db.prepare('DELETE FROM cotizaciones WHERE id = ?').run(fila.id);
    res.status(204).end();
  });

  function bloquearSiEmitida(fila, res) {
    if (fila.estado === 'emitida') {
      res.status(409).json({ error: 'Esta cotización está emitida y no se puede modificar' });
      return true;
    }
    return false;
  }

  router.post('/:id/lineas', (req, res) => {
    const fila = obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (bloquearSiEmitida(fila, res)) return;

    const error = validarLinea(req.body);
    if (error) return res.status(400).json({ error });

    const { descripcion, cantidad, precioUnitario, origen, servicioId } = req.body;
    db.prepare(
      `INSERT INTO lineas_cotizacion (cotizacion_id, descripcion, cantidad, precio_unitario, origen, servicio_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(fila.id, descripcion, cantidad, precioUnitario, origen || 'manual', servicioId || null);

    responderCotizacion(res, fila.id, 201);
  });

  router.put('/:id/lineas/:lineaId', (req, res) => {
    const fila = obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (bloquearSiEmitida(fila, res)) return;

    const linea = db
      .prepare('SELECT id FROM lineas_cotizacion WHERE id = ? AND cotizacion_id = ?')
      .get(req.params.lineaId, fila.id);
    if (!linea) return res.status(404).json({ error: 'Línea no encontrada' });

    const error = validarLinea(req.body);
    if (error) return res.status(400).json({ error });

    const { descripcion, cantidad, precioUnitario, origen, servicioId } = req.body;
    db.prepare(
      `UPDATE lineas_cotizacion SET descripcion = ?, cantidad = ?, precio_unitario = ?, origen = ?, servicio_id = ?
       WHERE id = ?`
    ).run(descripcion, cantidad, precioUnitario, origen || 'manual', servicioId || null, req.params.lineaId);

    responderCotizacion(res, fila.id);
  });

  router.delete('/:id/lineas/:lineaId', (req, res) => {
    const fila = obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (bloquearSiEmitida(fila, res)) return;

    db.prepare('DELETE FROM lineas_cotizacion WHERE id = ? AND cotizacion_id = ?').run(req.params.lineaId, fila.id);
    res.status(204).end();
  });

  return router;
}

module.exports = crearRutasCotizaciones;
