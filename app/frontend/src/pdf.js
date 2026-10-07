import { jsPDF } from 'jspdf';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

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

// El PDF nunca incluye publicidad (FR-026). Los datos fiscales salen de la copia guardada en la cotización (FR-016).
export function generarPdf(cotizacion, perfil = {}) {
  const doc = new jsPDF();
  const emisor = cotizacion.emisor || {};
  let y = 20;

  if (emisor.logoBase64) {
    doc.addImage(emisor.logoBase64, 'PNG', 15, y, 30, 20);
  } else {
    doc.setFontSize(16);
    doc.text(emisor.nombre || perfil.nombre || 'Profesional independiente', 15, y);
  }

  doc.setFontSize(10);
  let yEmisor = y + 25;
  if (emisor.nombre && emisor.logoBase64) {
    doc.text(emisor.nombre, 15, yEmisor);
    yEmisor += 5;
  }
  doc.text(`NIT / CC: ${emisor.documento || 'Pendiente de completar en el perfil'}`, 15, yEmisor);
  yEmisor += 5;
  if (emisor.regimen) {
    doc.text(REGIMEN[emisor.regimen] || emisor.regimen, 15, yEmisor);
    yEmisor += 5;
  }
  if (emisor.contacto) doc.text(`Contacto: ${emisor.contacto}`, 15, yEmisor);

  y = Math.max(y + 45, yEmisor + 8);
  doc.setFontSize(14);
  doc.text(`Cotización N.º ${cotizacion.numero}`, 15, y);

  y += 8;
  doc.setFontSize(10);
  doc.text(`Fecha de emisión: ${cotizacion.fechaEmision}`, 15, y);
  y += 5;
  doc.text(`Vigencia hasta: ${cotizacion.fechaVigencia}`, 15, y);

  y += 8;
  const cliente = cotizacion.cliente;
  doc.text('Cliente:', 15, y);
  y += 5;
  doc.text(`${cliente.nombre}`, 15, y);
  y += 5;
  doc.text(`NIT / CC: ${cliente.documento || 'No registrado'}`, 15, y);
  if (cliente.contacto) {
    y += 5;
    doc.text(`Contacto: ${cliente.contacto}`, 15, y);
  }

  y += 10;
  doc.setFontSize(11);
  doc.text('Descripción', 15, y);
  doc.text('Cant.', 120, y);
  doc.text('Precio unit.', 140, y);
  doc.text('Importe', 170, y);
  y += 2;
  doc.line(15, y, 195, y);
  y += 6;

  doc.setFontSize(10);
  cotizacion.lineas.forEach((linea) => {
    doc.text(String(linea.descripcion), 15, y);
    doc.text(String(linea.cantidad), 120, y);
    doc.text(formatoCOP.format(linea.precioUnitario), 140, y);
    doc.text(formatoCOP.format(linea.cantidad * linea.precioUnitario), 170, y);
    y += 6;
  });

  y += 6;
  doc.line(15, y, 195, y);
  y += 8;

  const t = cotizacion.totales;
  doc.text(`Base gravable: ${formatoCOP.format(t.baseGravable)}`, 130, y);
  y += 6;
  doc.text(`${ETIQUETA_IVA[cotizacion.ivaTarifa]}: ${formatoCOP.format(t.iva)}`, 130, y);
  y += 6;
  if (cotizacion.retencion.activada) {
    doc.text(`Retención en la fuente (${cotizacion.retencion.porcentaje} %): -${formatoCOP.format(t.retencion)}`, 130, y);
    y += 6;
  }
  doc.setFontSize(12);
  doc.text(`Total: ${formatoCOP.format(t.total)}`, 130, y);

  doc.save(`cotizacion-${cotizacion.numero}.pdf`);
}
