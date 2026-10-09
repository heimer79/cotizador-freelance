const express = require('express');
const { siguienteNumero } = require('../numeracion');
const { calcularCotizacion, calcularTotales, validarRetencion, TARIFAS_IVA } = require('../calculo');

// T060: Basic HTML stripping to prevent XSS in free-text fields (FR-043)
function sanitizarTexto(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

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
  const totales = calcularTotales({
    lineas,
    ivaTarifa: fila.iva_tarifa,
    ivaResponsable: fila.iva_responsable !== undefined ? !!fila.iva_responsable : true,
    retencionActivada: !!fila.retencion_activada,
    retencionPorcentaje: fila.retencion_porcentaje || 0,
    reteivaActivada: !!fila.reteiva_activada,
    reteivaPorcentaje: fila.reteiva_porcentaje || 15,
    reteicaActivada: !!fila.reteica_activada,
    reteicaPorcentaje: fila.reteica_porcentaje || 0,
    compensarRetencion: !!fila.compensar_retencion
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
      agenteRetenedor: !!fila.cliente_agente_retenedor,
      email: fila.cliente_email || '',
      telefono: fila.cliente_telefono || '',
      logoBase64: fila.cliente_logo_base64 || ''
    },
    emisor: {
      id: fila.emisor_id || null,
      tipo: fila.emisor_tipo || null,
      nombre: fila.emisor_nombre,
      documento: fila.emisor_documento,
      contacto: fila.emisor_contacto,
      regimen: fila.emisor_regimen,
      logoBase64: fila.emisor_logo_base64
    },
    ivaTarifa: fila.iva_tarifa,
    ivaResponsable: fila.iva_responsable !== undefined ? !!fila.iva_responsable : true,
    retencion: {
      activada: !!fila.retencion_activada,
      concepto: fila.retencion_concepto,
      porcentaje: fila.retencion_porcentaje
    },
    reteiva: {
      activada: !!fila.reteiva_activada,
      porcentaje: fila.reteiva_porcentaje || 15
    },
    reteica: {
      activada: !!fila.reteica_activada,
      porcentaje: fila.reteica_porcentaje || null
    },
    compensarRetencion: !!fila.compensar_retencion,
    plantillaPdf: fila.plantilla_pdf || 'profesional',
    coloresPdf: fila.colores_pdf ? JSON.parse(fila.colores_pdf) : null,
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

// Si se eligió un emisor adicional (no principal), sus datos vienen de la tabla `emisores`.
// El emisor principal sigue viniendo de `perfil` (que es también la fuente de la verdad
// para el aviso de "perfil fiscal incompleto" y conserva el campo de régimen tributario).
async function datosEmisor(db, usuarioId, emisorId) {
  if (emisorId) {
    const emisor = await db.get(
      'SELECT * FROM emisores WHERE id = ? AND usuario_id = ? AND es_principal = 0',
      [emisorId, usuarioId]
    );
    if (emisor) {
      return {
        emisor_nombre: emisor.nombre || null,
        emisor_documento: emisor.documento || null,
        emisor_contacto: emisor.telefono || emisor.email || null,
        emisor_regimen: null,
        emisor_logo_base64: emisor.logo_base64 || null
      };
    }
  }
  const perfil = (await db.get('SELECT * FROM perfil WHERE usuario_id = ?', [usuarioId])) || {};
  return {
    emisor_nombre: perfil.nombre || null,
    emisor_documento: perfil.nit || null,
    emisor_contacto: perfil.contacto || null,
    emisor_regimen: perfil.regimen || null,
    emisor_logo_base64: perfil.logo_base64 || null
  };
}

// T073: solo cuentas premium pueden usar un emisor distinto al principal (EC-7)
async function emisorIdPermitido(db, usuario, emisorIdCandidato) {
  if (!emisorIdCandidato) return null;
  if (usuario.tipoCuenta === 'premium' || usuario.rol === 'admin') return emisorIdCandidato;
  const fila = await db.get('SELECT es_principal FROM emisores WHERE id = ? AND usuario_id = ?', [emisorIdCandidato, usuario.id]);
  return fila && fila.es_principal ? emisorIdCandidato : null;
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
        total: completa.totales.totalNeto
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

    const reteiva = req.body.reteiva || {};
    const reteica = req.body.reteica || {};
    const plantillaPdf = req.body.plantillaPdf || 'profesional';
    const coloresPdf = req.body.coloresPdf ? JSON.stringify(req.body.coloresPdf) : null;
    const emisorId = await emisorIdPermitido(db, req.usuario, req.body.emisorId || null);
    const emisor = await datosEmisor(db, req.usuario.id, emisorId);

    const cotizacionId = await db.transaction(async (tx) => {
      const numero = await siguienteNumero(tx, req.usuario.id, ahora);
      const resultado = await tx.run(
        `INSERT INTO cotizaciones (
          usuario_id, numero, estado, fecha_emision, fecha_vigencia,
          cliente_id, cliente_nombre, cliente_documento, cliente_contacto, cliente_tipo, cliente_agente_retenedor,
          cliente_email, cliente_telefono, cliente_logo_base64,
          emisor_id, emisor_tipo,
          emisor_nombre, emisor_documento, emisor_contacto, emisor_regimen, emisor_logo_base64,
          iva_tarifa, iva_responsable, retencion_activada, retencion_concepto, retencion_porcentaje,
          reteiva_activada, reteiva_porcentaje, reteica_activada, reteica_porcentaje, compensar_retencion,
          plantilla_pdf, colores_pdf,
          temporal, ultima_actividad
        ) VALUES (?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
          cliente.email || null,
          cliente.telefono || null,
          cliente.logo_base64 || null,
          emisorId,
          null,
          ...Object.values(emisor),
          fiscal.valor.ivaTarifa,
          req.body.ivaResponsable !== undefined ? (req.body.ivaResponsable ? 1 : 0) : 1,
          fiscal.valor.retencionActivada,
          fiscal.valor.retencionConcepto,
          fiscal.valor.retencionPorcentaje,
          reteiva.activada ? 1 : 0,
          reteiva.porcentaje || 15,
          reteica.activada ? 1 : 0,
          reteica.porcentaje || null,
          req.body.compensarRetencion ? 1 : 0,
          plantillaPdf,
          coloresPdf,
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

    const reteivaPut = req.body.reteiva || {};
    const reteicaPut = req.body.reteica || {};
    const plantillaPdfPut = req.body.plantillaPdf !== undefined ? req.body.plantillaPdf : (fila.plantilla_pdf || 'profesional');
    const coloresPdfPut = req.body.coloresPdf !== undefined ? JSON.stringify(req.body.coloresPdf) : fila.colores_pdf;
    const emisorIdPut = req.body.emisorId !== undefined
      ? await emisorIdPermitido(db, req.usuario, req.body.emisorId)
      : fila.emisor_id;
    const emisor = await datosEmisor(db, req.usuario.id, emisorIdPut);

    await db.run(
      `UPDATE cotizaciones SET
        cliente_id = ?, cliente_nombre = ?, cliente_documento = ?, cliente_contacto = ?, cliente_tipo = ?, cliente_agente_retenedor = ?,
        cliente_email = ?, cliente_telefono = ?, cliente_logo_base64 = ?,
        emisor_id = ?,
        iva_tarifa = ?, iva_responsable = ?,
        retencion_activada = ?, retencion_concepto = ?, retencion_porcentaje = ?,
        reteiva_activada = ?, reteiva_porcentaje = ?,
        reteica_activada = ?, reteica_porcentaje = ?,
        compensar_retencion = ?,
        plantilla_pdf = ?, colores_pdf = ?,
        emisor_nombre = ?, emisor_documento = ?, emisor_contacto = ?, emisor_regimen = ?, emisor_logo_base64 = ?
       WHERE id = ?`,
      [
        cliente.id,
        cliente.nombre,
        cliente.documento,
        cliente.contacto,
        cliente.tipo,
        cliente.agente_retenedor,
        cliente.email || fila.cliente_email || null,
        cliente.telefono || fila.cliente_telefono || null,
        cliente.logo_base64 || fila.cliente_logo_base64 || null,
        emisorIdPut,
        fiscal.valor.ivaTarifa,
        req.body.ivaResponsable !== undefined ? (req.body.ivaResponsable ? 1 : 0) : fila.iva_responsable,
        fiscal.valor.retencionActivada,
        fiscal.valor.retencionConcepto,
        fiscal.valor.retencionPorcentaje,
        reteivaPut.activada !== undefined ? (reteivaPut.activada ? 1 : 0) : fila.reteiva_activada,
        reteivaPut.porcentaje || fila.reteiva_porcentaje || 15,
        reteicaPut.activada !== undefined ? (reteicaPut.activada ? 1 : 0) : fila.reteica_activada,
        reteicaPut.porcentaje !== undefined ? reteicaPut.porcentaje : fila.reteica_porcentaje,
        req.body.compensarRetencion !== undefined ? (req.body.compensarRetencion ? 1 : 0) : fila.compensar_retencion,
        plantillaPdfPut,
        coloresPdfPut,
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

  // T068: DELETE /api/cotizaciones/:id — owner-only, permanent (FR-046, FR-047)
  router.delete('/:id', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    await db.run('DELETE FROM cotizaciones WHERE id = ?', [fila.id]);
    res.json({ ok: true });
  });

  // T045: POST /api/cotizaciones/:id/compartir — genera enlace temporal (FR-031)
  router.post('/:id/compartir', async (req, res) => {
    const fila = await obtenerCotizacion(db, req.params.id, req.usuario.id);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });

    if (req.body && req.body.generarEnlace) {
      const { v4: uuidv4 } = require('uuid');
      const uuid = uuidv4();
      const expiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.run(
        `INSERT INTO enlaces_descarga (cotizacion_id, uuid, fecha_expiracion) VALUES (?, ?, ?)`,
        [fila.id, uuid, expiracion.toISOString().slice(0, 19).replace('T', ' ')]
      );
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      return res.json({
        enlace: `${baseUrl}/api/compartir/descargar/${uuid}`,
        expira: expiracion.toISOString()
      });
    }

    res.json({ ok: true });
  });

  // T046: GET /api/compartir/descargar/:uuid — public endpoint (FR-031)
  // Note: mounted separately in server.js at /api/compartir/descargar/:uuid

  // T038: GET /api/plantillas-pdf — list available templates (FR-024)
  // Note: mounted as a separate route, see below

  return router;
}

// T038: Separate router for plantillas-pdf listing (FR-024)
function crearRutasPlantillasPdf(db) {
  const router = require('express').Router();
  router.get('/', async (req, res) => {
    const filas = await db.all('SELECT * FROM plantillas_pdf ORDER BY solo_premium ASC, id ASC');
    res.json(filas.map(f => ({
      id: f.id,
      nombre: f.nombre,
      descripcion: f.descripcion || '',
      soloPremium: !!f.solo_premium,
      colores: { encabezado: f.color_encabezado, acento: f.color_acento, texto: f.color_texto }
    })));
  });
  return router;
}

// T046: Separate router for public PDF download via temporal link
function crearRutasCompartirDescarga(db) {
  const router = require('express').Router();
  router.get('/:uuid', async (req, res) => {
    const enlace = await db.get('SELECT * FROM enlaces_descarga WHERE uuid = ?', [req.params.uuid]);
    if (!enlace) return res.status(404).json({ error: 'Enlace no encontrado o expirado' });
    if (new Date(enlace.fecha_expiracion) < new Date()) {
      return res.status(410).json({ error: 'El enlace ha expirado' });
    }
    // Return the quote data as JSON; the client generates the PDF
    const fila = await db.get('SELECT * FROM cotizaciones WHERE id = ?', [enlace.cotizacion_id]);
    if (!fila) return res.status(404).json({ error: 'Cotización no encontrada' });
    const lineas = await db.all(
      'SELECT descripcion, cantidad, precio_unitario AS precioUnitario, origen, servicio_id AS servicioId FROM lineas_cotizacion WHERE cotizacion_id = ? ORDER BY id',
      [fila.id]
    );
    res.json({ fila, lineas });
  });
  return router;
}

module.exports = { crearRutasCotizaciones, crearRutasPlantillasPdf, crearRutasCompartirDescarga };
