const express = require('express');
const { siguienteNumero } = require('../numeracion');
const { calcularCotizacion, validarRetencion, TARIFAS_IVA } = require('../calculo');

const VIGENCIA_DIAS = 30;

// Límite de cotizaciones guardadas por tipo de cuenta. Los administradores no tienen límite.
const LIMITE_COTIZACIONES = {
  gratuita: 20,
  premium: 500
};

async function obtenerLineas(db, cotizacionId) {
  return db.all(
    `SELECT id, descripcion, cantidad, precio_unitario AS precioUnitario, origen, servicio_id AS servicioId
     FROM lineas_cotizacion WHERE cotizacion_id = ? ORDER BY id`,
    [cotizacionId]
  );
}

async function construirCotizacion(db, fila) {
  const lineas = await obtenerLineas(db, fila.id);
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

async function obtenerCotizacion(db, id, usuarioId) {
  return db.get('SELECT * FROM cotizaciones WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
}

async function obtenerCliente(db, clienteId, usuarioId) {
  return db.get('SELECT * FROM clientes WHERE id = ? AND usuario_id = ?', [clienteId, usuarioId]);
}

async function datosEmisor(db, usuarioId) {
  const perfil = (await db.get('SELECT * FROM perfil WHERE usuario_id = ?', [usuarioId])) || {};
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

  async function responderCotizacion(res, id, codigo = 200) {
    const fila = await db.get('SELECT * FROM cotizaciones WHERE id = ?', [id]);
    res.status(codigo).json(await construirCotizacion(db, fila));
  }

  router.get('/', async (req, res) => {
    const filas = await db.all(
      'SELECT * FROM cotizaciones WHERE usuario_id = ? ORDER BY id DESC',
      [req.usuario.id]
    );
    const resultados = [];
    for (const fila of filas) {
      const completa = await construirCotizacion(db, fila);
      resultados.push({
        id: completa.id,
        numero: completa.numero,
        estado: completa.estado,
        fechaEmision: completa.fechaEmision,
        cliente: { nombre: completa.cliente.nombre, tipo: completa.cliente.tipo },
        total: completa.totales.total
      });
    }
    res.json(resultados);
  });

  router.get('/:id', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    res.json(await construirCotizacion(db, fila));
  });

  router.post('/', async (req, res) => {
    const cliente = await obtenerCliente(db, req.body.clienteId, req.usuario.id);
    if (!cliente) return res.status(400).json({ error: 'El cliente indicado no existe' });

    const fiscal = leerConfiguracionFiscal(req.body, cliente);
    if (fiscal.error) return res.status(422).json({ error: fiscal.error });

    const ahora = new Date();
    const emisor = await datosEmisor(db, req.usuario.id);

    const limite = req.usuario.rol === 'admin' ? null : (LIMITE_COTIZACIONES[req.usuario.tipoCuenta] ?? LIMITE_COTIZACIONES.gratuita);
    if (limite !== null) {
      const cuenta = await db.get('SELECT COUNT(*) AS cnt FROM cotizaciones WHERE usuario_id = ?', [req.usuario.id]);
      if (cuenta.cnt >= limite) {
        return res.status(403).json({
          error: `Has alcanzado el límite de ${limite} cotizaciones de tu plan. Elimina algunas para continuar.`,
          enlacePlanes: '/planes'
        });
      }
    }

    const cotizacionId = await db.transaction(async (tx) => {
      const numero = await siguienteNumero(tx, req.usuario.id, ahora);
      const resultado = await tx.run(
        `INSERT INTO cotizaciones (
          usuario_id, numero, estado, fecha_emision, fecha_vigencia,
          cliente_id, cliente_nombre, cliente_documento, cliente_contacto, cliente_tipo, cliente_agente_retenedor,
          emisor_nombre, emisor_documento, emisor_contacto, emisor_regimen, emisor_logo_base64,
          iva_tarifa, retencion_activada, retencion_concepto, retencion_porcentaje,
          temporal, ultima_actividad
        ) VALUES (?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
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
          ...Object.values(emisor),
          fiscal.valor.ivaTarifa,
          fiscal.valor.retencionActivada,
          fiscal.valor.retencionConcepto,
          fiscal.valor.retencionPorcentaje,
          0
        ]
      );
      return resultado.insertId;
    });

    await responderCotizacion(res, cotizacionId, 201);
  });

  router.put('/:id', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (fila.estado === 'emitida') {
      return res.status(409).json({ error: 'Esta cotización está emitida y no se puede modificar' });
    }

    const cliente = req.body.clienteId !== undefined
      ? await obtenerCliente(db, req.body.clienteId, req.usuario.id)
      : { id: fila.cliente_id, nombre: fila.cliente_nombre, documento: fila.cliente_documento, contacto: fila.cliente_contacto, tipo: fila.cliente_tipo, agente_retenedor: fila.cliente_agente_retenedor };
    if (!cliente) return res.status(400).json({ error: 'El cliente indicado no existe' });

    const fiscal = leerConfiguracionFiscal(
      { ivaTarifa: req.body.ivaTarifa ?? fila.iva_tarifa, retencion: req.body.retencion ?? {
        activada: !!fila.retencion_activada, concepto: fila.retencion_concepto, porcentaje: fila.retencion_porcentaje
      } },
      cliente
    );
    if (fiscal.error) return res.status(422).json({ error: fiscal.error });

    const emisor = await datosEmisor(db, req.usuario.id);
    await db.run(
      `UPDATE cotizaciones SET
        cliente_id = ?, cliente_nombre = ?, cliente_documento = ?, cliente_contacto = ?, cliente_tipo = ?, cliente_agente_retenedor = ?,
        iva_tarifa = ?, retencion_activada = ?, retencion_concepto = ?, retencion_porcentaje = ?,
        emisor_nombre = ?, emisor_documento = ?, emisor_contacto = ?, emisor_regimen = ?, emisor_logo_base64 = ?
       WHERE id = ?`,
      [
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
        ...Object.values(emisor),
        fila.id
      ]
    );

    await responderCotizacion(res, fila.id);
  });

  router.post('/:id/emitir', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (fila.estado === 'emitida') return res.status(409).json({ error: 'La cotización ya está emitida' });

    const lineas = await obtenerLineas(db, fila.id);
    if (lineas.length === 0) {
      return res.status(422).json({ error: 'Agrega al menos una línea antes de emitir la cotización' });
    }

    const ahora = new Date();
    await db.run(
      `UPDATE cotizaciones SET estado = 'emitida', fecha_emision = ?, fecha_vigencia = ? WHERE id = ?`,
      [formatoFecha(ahora), formatoFecha(sumarDias(ahora, VIGENCIA_DIAS)), fila.id]
    );

    await responderCotizacion(res, fila.id);
  });

  router.delete('/:id', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (fila.estado === 'emitida') {
      return res.status(409).json({ error: 'Las cotizaciones emitidas no se pueden eliminar' });
    }
    await db.run('DELETE FROM cotizaciones WHERE id = ?', [fila.id]);
    res.status(204).end();
  });

  function bloquearSiEmitida(fila, res) {
    if (fila.estado === 'emitida') {
      res.status(409).json({ error: 'Esta cotización está emitida y no se puede modificar' });
      return true;
    }
    return false;
  }

  router.post('/:id/lineas', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (bloquearSiEmitida(fila, res)) return;

    const error = validarLinea(req.body);
    if (error) return res.status(400).json({ error });

    const { descripcion, cantidad, precioUnitario, origen, servicioId } = req.body;
    await db.run(
      `INSERT INTO lineas_cotizacion (cotizacion_id, descripcion, cantidad, precio_unitario, origen, servicio_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fila.id, descripcion, cantidad, precioUnitario, origen || 'manual', servicioId || null]
    );

    await responderCotizacion(res, fila.id, 201);
  });

  router.put('/:id/lineas/:lineaId', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (bloquearSiEmitida(fila, res)) return;

    const linea = await db.get(
      'SELECT id FROM lineas_cotizacion WHERE id = ? AND cotizacion_id = ?',
      [req.params.lineaId, fila.id]
    );
    if (!linea) return res.status(404).json({ error: 'Línea no encontrada' });

    const error = validarLinea(req.body);
    if (error) return res.status(400).json({ error });

    const { descripcion, cantidad, precioUnitario, origen, servicioId } = req.body;
    await db.run(
      `UPDATE lineas_cotizacion SET descripcion = ?, cantidad = ?, precio_unitario = ?, origen = ?, servicio_id = ?
       WHERE id = ?`,
      [descripcion, cantidad, precioUnitario, origen || 'manual', servicioId || null, req.params.lineaId]
    );

    await responderCotizacion(res, fila.id);
  });

  router.delete('/:id/lineas/:lineaId', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (bloquearSiEmitida(fila, res)) return;

    await db.run('DELETE FROM lineas_cotizacion WHERE id = ? AND cotizacion_id = ?', [req.params.lineaId, fila.id]);
    res.status(204).end();
  });

  return router;
}

module.exports = crearRutasCotizaciones;
