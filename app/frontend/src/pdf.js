import { jsPDF } from 'jspdf';

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const REGIMEN = {
  ordinario: 'Régimen ordinario',
  simple: 'Régimen simple de tributación (SIMPLE)',
  no_responsable_iva: 'No responsable de IVA'
};

const ETIQUETA_IVA = {
  19: 'IVA (19 %)',
  5: 'IVA reducido (5 %)',
  0: 'Excluido de IVA (0 %)'
};

// Render tax breakdown rows common to all templates.
// Returns the new y position.
function renderTotales(doc, cotizacion, x, y) {
  const t = cotizacion.totales || {};
  const iva = cotizacion.ivaTarifa ?? 19;
  const rows = [
    ['Base gravable', t.baseGravable || 0],
    [ETIQUETA_IVA[iva] || `IVA (${iva} %)`, t.iva || 0]
  ];
  if (cotizacion.retencion?.activada)
    rows.push([`Retención en la fuente (${cotizacion.retencion.porcentaje} %)`, -(t.retencion || 0)]);
  if (cotizacion.reteiva?.activada)
    rows.push([`ReteIVA (${cotizacion.reteiva.porcentaje || 15} % del IVA)`, -(t.reteiva || 0)]);
  if (cotizacion.reteica?.activada)
    rows.push([`ReteICA (${cotizacion.reteica.porcentaje || 0} ‰)`, -(t.reteica || 0)]);
  if (t.compensacion)
    rows.push(['Compensación retención', t.compensacion]);

  doc.setFontSize(9);
  for (const [label, val] of rows) {
    doc.text(label + ':', x, y);
    doc.text(fmt.format(val), 195, y, { align: 'right' });
    y += 5;
  }

  doc.setLineWidth(0.3);
  doc.line(x, y, 195, y);
  y += 5;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Total neto:', x, y);
  doc.text(fmt.format(t.totalNeto ?? (t.total || 0)), 195, y, { align: 'right' });
  doc.setFont(undefined, 'normal');
  return y + 8;
}

// ─── T040: Plantilla "Profesional" (base existente + colores + tax breakdown completo) ───
function plantillaProfesional(cotizacion, perfil, colores = {}) {
  const doc = new jsPDF();
  const acento = colores.acento || '#2563eb';
  const encabezado = colores.encabezado || '#1e3a5f';
  const emisor = cotizacion.emisor || {};
  let y = 20;

  // Logo o nombre del emisor
  if (emisor.logoBase64) {
    doc.addImage(emisor.logoBase64, 'PNG', 15, y, 30, 20);
  } else {
    doc.setFontSize(15);
    doc.setTextColor(encabezado);
    doc.text(emisor.nombre || perfil.nombre || 'Profesional independiente', 15, y);
  }

  doc.setFontSize(9);
  doc.setTextColor('#374151');
  let yE = y + 25;
  if (emisor.nombre && emisor.logoBase64) { doc.text(emisor.nombre, 15, yE); yE += 5; }
  doc.text(`NIT / CC: ${emisor.documento || perfil.nit || 'Pendiente'}`, 15, yE); yE += 5;
  if (emisor.regimen || perfil.regimen) { doc.text(REGIMEN[emisor.regimen || perfil.regimen] || '', 15, yE); yE += 5; }
  if (emisor.contacto || perfil.contacto) { doc.text(`Contacto: ${emisor.contacto || perfil.contacto}`, 15, yE); yE += 5; }

  y = Math.max(y + 48, yE + 8);
  doc.setFontSize(14);
  doc.setTextColor(acento);
  doc.setFont(undefined, 'bold');
  doc.text(`Cotización N.º ${cotizacion.numero}`, 15, y);
  doc.setFont(undefined, 'normal');
  doc.setTextColor('#374151');

  y += 7;
  doc.setFontSize(9);
  doc.text(`Fecha de emisión: ${cotizacion.fechaEmision}`, 15, y);
  y += 5;
  doc.text(`Vigencia hasta: ${cotizacion.fechaVigencia}`, 15, y);

  y += 8;
  const cliente = cotizacion.cliente;
  doc.setFont(undefined, 'bold'); doc.text('Cliente:', 15, y); doc.setFont(undefined, 'normal');
  y += 5;
  doc.text(cliente.nombre, 15, y); y += 5;
  doc.text(`NIT / CC: ${cliente.documento || 'No registrado'}`, 15, y);
  if (cliente.contacto) { y += 5; doc.text(`Contacto: ${cliente.contacto}`, 15, y); }
  if (cliente.email) { y += 5; doc.text(`Email: ${cliente.email}`, 15, y); }

  y += 10;
  doc.setFillColor(encabezado);
  doc.rect(15, y - 4, 180, 7, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(9);
  doc.text('Descripción', 17, y);
  doc.text('Cant.', 130, y, { align: 'right' });
  doc.text('Precio unit.', 165, y, { align: 'right' });
  doc.text('Importe', 193, y, { align: 'right' });
  doc.setTextColor('#374151');
  y += 7;

  cotizacion.lineas.forEach((linea, i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 180, 6.5, 'F'); }
    doc.setFontSize(9);
    const desc = doc.splitTextToSize(String(linea.descripcion), 110);
    doc.text(desc, 17, y);
    doc.text(String(linea.cantidad), 130, y, { align: 'right' });
    doc.text(fmt.format(linea.precioUnitario), 165, y, { align: 'right' });
    doc.text(fmt.format(linea.cantidad * linea.precioUnitario), 193, y, { align: 'right' });
    y += desc.length > 1 ? 6 * desc.length : 6;
  });

  y += 4;
  doc.setLineWidth(0.5);
  doc.setDrawColor(acento);
  doc.line(15, y, 195, y);
  doc.setDrawColor(0);
  y += 8;

  y = renderTotales(doc, cotizacion, 120, y);
  return doc;
}

// ─── T041: Plantilla "Moderna" ─── clean, colored left bar, minimal
function plantillaModerna(cotizacion, perfil, colores = {}) {
  const doc = new jsPDF();
  const primario = colores.encabezado || '#7c3aed';
  const acento = colores.acento || '#ddd6fe';
  const emisor = cotizacion.emisor || {};

  // Side accent bar
  doc.setFillColor(primario);
  doc.rect(0, 0, 8, 297, 'F');

  // Header zone
  doc.setFillColor(248, 247, 255);
  doc.rect(8, 0, 202, 45, 'F');

  doc.setFontSize(20);
  doc.setTextColor(primario);
  doc.setFont(undefined, 'bold');
  doc.text('COTIZACIÓN', 20, 20);
  doc.setFont(undefined, 'normal');

  doc.setFontSize(10);
  doc.setTextColor('#4b5563');
  doc.text(`N.º ${cotizacion.numero}`, 20, 28);
  doc.text(`Emisión: ${cotizacion.fechaEmision}  ·  Vigencia: ${cotizacion.fechaVigencia}`, 20, 35);

  // Emisor block (right)
  const nombreEmisor = emisor.nombre || perfil.nombre || '';
  if (emisor.logoBase64) {
    doc.addImage(emisor.logoBase64, 'PNG', 150, 5, 30, 20);
  } else if (nombreEmisor) {
    doc.setFontSize(11);
    doc.setTextColor(primario);
    doc.setFont(undefined, 'bold');
    doc.text(nombreEmisor, 195, 15, { align: 'right' });
    doc.setFont(undefined, 'normal');
  }
  doc.setFontSize(8);
  doc.setTextColor('#6b7280');
  const nitE = emisor.documento || perfil.nit || '';
  if (nitE) doc.text(`NIT: ${nitE}`, 195, 22, { align: 'right' });
  const contE = emisor.contacto || perfil.contacto || '';
  if (contE) doc.text(contE, 195, 28, { align: 'right' });

  let y = 55;
  // Cliente
  doc.setFontSize(8);
  doc.setTextColor('#9ca3af');
  doc.text('PARA', 20, y);
  y += 5;
  doc.setFontSize(11);
  doc.setTextColor('#111827');
  doc.setFont(undefined, 'bold');
  doc.text(cotizacion.cliente.nombre, 20, y);
  doc.setFont(undefined, 'normal');
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor('#4b5563');
  if (cotizacion.cliente.documento) { doc.text(`NIT: ${cotizacion.cliente.documento}`, 20, y); y += 5; }
  if (cotizacion.cliente.email) { doc.text(cotizacion.cliente.email, 20, y); y += 5; }

  y += 8;
  // Table header
  doc.setFillColor(primario);
  doc.rect(15, y - 4, 180, 7, 'F');
  doc.setTextColor('#fff');
  doc.setFontSize(8);
  doc.text('Servicio / Descripción', 20, y);
  doc.text('Cant.', 138, y, { align: 'right' });
  doc.text('Precio unit.', 168, y, { align: 'right' });
  doc.text('Total', 193, y, { align: 'right' });
  y += 7;

  doc.setTextColor('#111827');
  cotizacion.lineas.forEach((linea, i) => {
    if (i % 2 === 0) { doc.setFillColor(acento); doc.rect(15, y - 4, 180, 6.5, 'F'); }
    doc.setFontSize(9);
    const desc = doc.splitTextToSize(String(linea.descripcion), 115);
    doc.text(desc, 20, y);
    doc.text(String(linea.cantidad), 138, y, { align: 'right' });
    doc.text(fmt.format(linea.precioUnitario), 168, y, { align: 'right' });
    doc.text(fmt.format(linea.cantidad * linea.precioUnitario), 193, y, { align: 'right' });
    y += desc.length > 1 ? 6 * desc.length : 6;
  });

  y += 6;
  doc.setDrawColor(primario);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  doc.setDrawColor(0);
  y += 8;

  y = renderTotales(doc, cotizacion, 118, y);
  return doc;
}

// ─── T042: Plantilla "Ejecutiva" ─── two-column header, clean corporate
function plantillaEjecutiva(cotizacion, perfil, colores = {}) {
  const doc = new jsPDF();
  const oscuro = colores.encabezado || '#1e293b';
  const dorado = colores.acento || '#f59e0b';
  const emisor = cotizacion.emisor || {};

  // Full-width header bar
  doc.setFillColor(oscuro);
  doc.rect(0, 0, 210, 35, 'F');

  // Emisor name
  const nombreEmisor = emisor.nombre || perfil.nombre || 'Profesional independiente';
  if (emisor.logoBase64) {
    doc.addImage(emisor.logoBase64, 'PNG', 10, 7, 25, 18);
    doc.setFontSize(11); doc.setTextColor('#fff'); doc.text(nombreEmisor, 40, 15);
  } else {
    doc.setFontSize(14); doc.setTextColor('#fff'); doc.setFont(undefined, 'bold');
    doc.text(nombreEmisor, 15, 18);
    doc.setFont(undefined, 'normal');
  }

  doc.setFontSize(8); doc.setTextColor('#94a3b8');
  const nitE = emisor.documento || perfil.nit || '';
  if (nitE) doc.text(`NIT: ${nitE}`, 15, 27);
  const contE = emisor.contacto || perfil.contacto || '';
  if (contE) doc.text(contE, 90, 27);

  // Cotización badge (right side of header)
  doc.setFillColor(dorado);
  doc.rect(140, 0, 70, 35, 'F');
  doc.setFontSize(8); doc.setTextColor(oscuro); doc.setFont(undefined, 'bold');
  doc.text('COTIZACIÓN', 175, 12, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.setFontSize(16); doc.text(cotizacion.numero, 175, 22, { align: 'center' });
  doc.setFontSize(7); doc.text(cotizacion.fechaEmision, 175, 30, { align: 'center' });

  let y = 50;
  doc.setTextColor('#1e293b');
  // Two-column: client + validity
  doc.setFontSize(8); doc.setTextColor('#94a3b8'); doc.text('CLIENTE', 15, y);
  doc.text('VIGENCIA', 130, y);
  y += 5;
  doc.setFontSize(10); doc.setTextColor('#1e293b'); doc.setFont(undefined, 'bold');
  doc.text(cotizacion.cliente.nombre, 15, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9); doc.text(`Hasta: ${cotizacion.fechaVigencia}`, 130, y);
  y += 5;
  doc.setFontSize(8); doc.setTextColor('#4b5563');
  if (cotizacion.cliente.documento) doc.text(`NIT: ${cotizacion.cliente.documento}`, 15, y);
  y += 5;
  if (cotizacion.cliente.contacto) doc.text(cotizacion.cliente.contacto, 15, y);

  y += 12;
  // Table header
  doc.setFillColor(oscuro);
  doc.rect(15, y - 5, 180, 8, 'F');
  doc.setTextColor('#fff'); doc.setFontSize(8);
  doc.text('Descripción', 20, y);
  doc.text('Cant.', 135, y, { align: 'right' });
  doc.text('P. Unitario', 165, y, { align: 'right' });
  doc.text('Importe', 193, y, { align: 'right' });
  y += 7;

  doc.setTextColor('#1e293b');
  cotizacion.lineas.forEach((linea, i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(15, y - 4, 180, 6.5, 'F'); }
    doc.setFontSize(9);
    const desc = doc.splitTextToSize(String(linea.descripcion), 112);
    doc.text(desc, 20, y);
    doc.text(String(linea.cantidad), 135, y, { align: 'right' });
    doc.text(fmt.format(linea.precioUnitario), 165, y, { align: 'right' });
    doc.text(fmt.format(linea.cantidad * linea.precioUnitario), 193, y, { align: 'right' });
    y += desc.length > 1 ? 6 * desc.length : 6;
  });

  y += 4;
  doc.setFillColor(dorado);
  doc.rect(15, y, 180, 1.5, 'F');
  y += 10;

  y = renderTotales(doc, cotizacion, 120, y);
  return doc;
}

const PLANTILLAS = {
  moderna: plantillaModerna,
  ejecutiva: plantillaEjecutiva
};

function construirDoc(cotizacion, perfil = {}, opciones = {}) {
  const nombre = opciones.plantilla || 'profesional';
  const colores = opciones.colores || {};
  const fn = PLANTILLAS[nombre] || plantillaProfesional;
  return fn(cotizacion, perfil, colores);
}

export function generarPdf(cotizacion, perfil = {}, opciones = {}) {
  construirDoc(cotizacion, perfil, opciones).save(`cotizacion-${cotizacion.numero}.pdf`);
}

export function generarPdfBase64(cotizacion, perfil = {}, opciones = {}) {
  return construirDoc(cotizacion, perfil, opciones).output('datauristring');
}

export function previsualizarPdf(cotizacion, perfil = {}, opciones = {}) {
  const url = construirDoc(cotizacion, perfil, opciones).output('bloburl');
  window.open(url, '_blank', 'noopener');
}
