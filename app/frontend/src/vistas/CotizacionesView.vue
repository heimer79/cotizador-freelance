<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue';
import { calcularTotales } from '../calculo.js';
import { cotizaciones as apiCotizaciones, clientes as apiClientes, catalogo as apiCatalogo, perfil as apiPerfil, compartir as apiCompartir } from '../api.js';
import { generarPdf, generarPdfBase64, generarPdfArchivo, previsualizarPdf } from '../pdf.js';
import DirectAdSlot from '../components/ads/DirectAdSlot.vue';
import ClienteSelector from '../components/ClienteSelector.vue';
import NuevoClienteForm from '../components/NuevoClienteForm.vue';
import ConfiguracionImpuestos from '../components/ConfiguracionImpuestos.vue';
import DesgloseTotales from '../components/DesgloseTotales.vue';
import ServicioCatalogoSelector from '../components/ServicioCatalogoSelector.vue';
import EmisorSelector from '../components/EmisorSelector.vue';
import PlantillaPdfSelector from '../components/PlantillaPdfSelector.vue';
import { useAutoguardado } from '../composables/useAutoguardado.js';

const props = defineProps({
  modo: { type: String, default: 'editor' }
});

const requireLogin = inject('requireLogin');
const toast = inject('toast', null);
const isPremium = inject('isPremium', ref(false));
const cambiarVista = inject('cambiarVista', null);
const compartiendoWhatsapp = ref(false);
const guardando = ref(false);

// T036: emisor seleccionado para la cotización actual (FR-018, FR-020)
const emisorId = ref(null);

// T044: plantilla y colores de PDF (FR-024, FR-025)
const plantillaPdf = ref('profesional');
const coloresPdf = ref({});
function onEmisorChange(emisor) {
  if (!emisor) return;
  emisorId.value = emisor.id;
  // Auto-fill perfil local con datos del emisor si no hay datos guardados
  if (!perfil.value.nombre) {
    perfil.value = {
      ...perfil.value,
      nombre: emisor.nombre,
      nit: emisor.documento,
      tipoEmisor: emisor.tipoEmisor
    };
  }
}

const CONCEPTOS = {
  honorarios: { nombre: 'Honorarios', porcentajes: [10, 11] },
  servicios: { nombre: 'Servicios generales', porcentajes: [4, 6] },
  compras: { nombre: 'Compras', porcentajes: [2.5, 3.5] }
};
const TARIFAS_IVA = [
  { valor: 19, etiqueta: 'General (19 %)' },
  { valor: 5, etiqueta: 'Reducida (5 %)' },
  { valor: 0, etiqueta: 'Excluido (0 %)' }
];

const formato = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const lista = ref([]);
const clientes = ref([]);
const servicios = ref([]);
const perfil = ref({});
const error = ref('');
const aviso = ref('');
const cargando = ref(false);

const actual = ref(null);
const creando = ref(false);
const nuevaClienteId = ref('');
const clienteNuevoSeleccionado = ref(null);
const vistaLista = ref(props.modo === 'lista');
const clienteSelectorCrear = ref(null);
const clienteSelectorEditor = ref(null);

function clienteCreadoEnCrear(c) {
  clientes.value.push(c);
  clienteSelectorCrear.value?.agregarCliente(c);
}

function clienteCreadoEnEditor(c) {
  clientes.value.push(c);
  clienteSelectorEditor.value?.agregarCliente(c);
}

// Búsqueda y filtro del listado "Mis cotizaciones" (datos reales, sin estados inventados)
const busquedaLista = ref('');
const filtroEstado = ref('todas');
const listaFiltrada = computed(() => {
  let items = lista.value;
  if (filtroEstado.value !== 'todas') items = items.filter((c) => c.estado === filtroEstado.value);
  const q = busquedaLista.value.trim().toLowerCase();
  if (q) {
    items = items.filter((c) =>
      (c.cliente?.nombre || '').toLowerCase().includes(q) ||
      String(c.numero || '').toLowerCase().includes(q)
    );
  }
  return items;
});
const statsLista = computed(() => ({
  totalCotizado: lista.value.reduce((sum, c) => sum + (c.total || 0), 0),
  emitidas: lista.value.filter((c) => c.estado === 'emitida').length,
  borradores: lista.value.filter((c) => c.estado === 'borrador').length
}));
function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

const borrador = computed(() => !actual.value || actual.value.estado === 'borrador');

const clienteId = ref('');
const ivaTarifa = ref(19);
const ivaResponsable = ref(true);
const retencionActiva = ref(false);
const retencionConcepto = ref('honorarios');
const retencionPorcentaje = ref(11);
const reteivaActivada = ref(false);
const reteivaPorcentaje = ref(15);
const reteicaActivada = ref(false);
const reteicaPorcentaje = ref(0);
const compensarRetencion = ref(false);

const lineaForm = ref({ descripcion: '', cantidad: 1, precioUnitario: '', servicioId: '' });
const lineaEditandoId = ref(null);

// Local cotizador state (before login)
const localLineas = ref([]);
const localEmisor = ref({ nombre: '', nit: '', correo: '', telefono: '' });
const localCliente = ref({ nombre: '', nit: '', contacto: '', tipo: 'empresa' });
const localRetencionActiva = ref(false);
const localIvaTarifa = ref(19);

const localSubtotal = computed(() => localLineas.value.reduce((sum, l) => sum + l.cantidad * l.precioUnitario, 0));
const localIva = computed(() => Math.round(localSubtotal.value * localIvaTarifa.value / 100));
const localRetencion = computed(() => localRetencionActiva.value ? Math.round(localSubtotal.value * 0.11) : 0);
const localTotal = computed(() => localSubtotal.value + localIva.value - localRetencion.value);

const clienteSeleccionado = computed(() => clientes.value.find((c) => String(c.id) === String(clienteId.value)));
const clienteElegible = computed(() => !!(clienteSeleccionado.value && clienteSeleccionado.value.agenteRetenedor));
const perfilIncompleto = computed(() => !perfil.value.nit || !perfil.value.nombre || !perfil.value.regimen);

// Totales reactivos calculados en el frontend (FR-011, SC-003)
const lineasActuales = ref([]);
const totalesActuales = computed(() => calcularTotales({
  lineas: lineasActuales.value,
  ivaTarifa: ivaTarifa.value,
  ivaResponsable: ivaResponsable.value,
  retencionActivada: retencionActiva.value,
  retencionPorcentaje: retencionPorcentaje.value,
  reteivaActivada: reteivaActivada.value,
  reteivaPorcentaje: reteivaPorcentaje.value,
  reteicaActivada: reteicaActivada.value,
  reteicaPorcentaje: reteicaPorcentaje.value,
  compensarRetencion: compensarRetencion.value
}));

function onConfigImpuestosChange(config) {
  ivaResponsable.value = config.ivaResponsable;
  ivaTarifa.value = config.ivaTarifa;
  retencionActiva.value = config.retencionActivada;
  retencionConcepto.value = config.retencionConcepto;
  retencionPorcentaje.value = config.retencionPorcentaje;
  reteivaActivada.value = config.reteivaActivada;
  reteivaPorcentaje.value = config.reteivaPorcentaje;
  reteicaActivada.value = config.reteicaActivada;
  reteicaPorcentaje.value = config.reteicaPorcentaje;
  compensarRetencion.value = config.compensarRetencion;
  autoguardado.disparar();
}

// T028, T029, T030, T031: Autoguardado dual (localStorage + servidor, debounce 5s)
const autoguardado = useAutoguardado(
  computed(() => actual.value ? `borrador-cotizacion-${actual.value.id}` : 'borrador-cotizacion-nueva'),
  () => ({
    clienteId: clienteId.value,
    ivaTarifa: ivaTarifa.value,
    ivaResponsable: ivaResponsable.value,
    retencionActivada: retencionActiva.value,
    retencionConcepto: retencionConcepto.value,
    retencionPorcentaje: retencionPorcentaje.value,
    reteivaActivada: reteivaActivada.value,
    reteivaPorcentaje: reteivaPorcentaje.value,
    reteicaActivada: reteicaActivada.value,
    reteicaPorcentaje: reteicaPorcentaje.value,
    compensarRetencion: compensarRetencion.value
  }),
  async (datos) => {
    if (!actual.value) return;
    await apiCotizaciones.actualizar(actual.value.id, {
      clienteId: Number(datos.clienteId),
      ivaTarifa: datos.ivaTarifa,
      ivaResponsable: datos.ivaResponsable,
      retencion: { activada: datos.retencionActivada, concepto: datos.retencionConcepto, porcentaje: datos.retencionPorcentaje },
      reteiva: { activada: datos.reteivaActivada, porcentaje: datos.reteivaPorcentaje },
      reteica: { activada: datos.reteicaActivada, porcentaje: datos.reteicaPorcentaje },
      compensarRetencion: datos.compensarRetencion
    });
  }
);

// Observar cambios en clienteId para disparar autoguardado (T030)
watch(clienteId, () => autoguardado.disparar());
watch(lineasActuales, () => autoguardado.disparar(), { deep: true });

let nextLocalId = 1;

function agregarLineaLocal() {
  if (!lineaForm.value.descripcion || !lineaForm.value.precioUnitario) return;
  localLineas.value.push({
    id: nextLocalId++,
    descripcion: lineaForm.value.descripcion,
    cantidad: Number(lineaForm.value.cantidad),
    precioUnitario: Number(lineaForm.value.precioUnitario)
  });
  lineaForm.value = { descripcion: '', cantidad: 1, precioUnitario: '', servicioId: '' };
}

function eliminarLineaLocal(id) {
  localLineas.value = localLineas.value.filter(l => l.id !== id);
}

function cargarFiscal(cot) {
  clienteId.value = cot.cliente.id;
  emisorId.value = cot.emisor?.id || null;
  ivaTarifa.value = cot.ivaTarifa || 19;
  ivaResponsable.value = cot.ivaResponsable !== undefined ? cot.ivaResponsable : true;
  retencionActiva.value = cot.retencion ? cot.retencion.activada : false;
  retencionConcepto.value = (cot.retencion && cot.retencion.concepto) || 'honorarios';
  retencionPorcentaje.value = (cot.retencion && cot.retencion.porcentaje) || CONCEPTOS[retencionConcepto.value]?.porcentajes[1] || 11;
  reteivaActivada.value = cot.reteiva ? cot.reteiva.activada : false;
  reteivaPorcentaje.value = (cot.reteiva && cot.reteiva.porcentaje) || 15;
  reteicaActivada.value = cot.reteica ? cot.reteica.activada : false;
  reteicaPorcentaje.value = (cot.reteica && cot.reteica.porcentaje) || 0;
  compensarRetencion.value = !!cot.compensarRetencion;
  lineasActuales.value = cot.lineas || [];
}

function abrirEditor(cot) {
  actual.value = cot;
  vistaLista.value = false;
  cargarFiscal(cot);
  error.value = '';
  aviso.value = '';
  limpiarLinea();
}

async function cargarTodo() {
  cargando.value = true;
  error.value = '';
  try {
    const [l, c, s, p] = await Promise.all([apiCotizaciones.listar(), apiClientes.listar(), apiCatalogo.listar(), apiPerfil.obtener()]);
    lista.value = l;
    clientes.value = c;
    servicios.value = s;
    perfil.value = p;
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
}

async function recargarLista() {
  lista.value = await apiCotizaciones.listar();
}

async function abrir(id) {
  try {
    abrirEditor(await apiCotizaciones.obtener(id));
  } catch (e) {
    error.value = e.message;
  }
}

function nueva() {
  creando.value = true;
  nuevaClienteId.value = '';
  error.value = '';
}

async function crear() {
  error.value = '';
  if (!nuevaClienteId.value) {
    error.value = 'Elige un cliente para crear la cotización.';
    return;
  }
  try {
    const creada = await apiCotizaciones.crear({
      clienteId: Number(nuevaClienteId.value),
      ivaTarifa: 19,
      retencion: { activada: false },
      ...(emisorId.value ? { emisorId: emisorId.value } : {})
    });
    creando.value = false;
    abrirEditor(creada);
    await recargarLista();
  } catch (e) {
    error.value = e.message;
  }
}

function volverALista() {
  actual.value = null;
  creando.value = false;
  error.value = '';
  aviso.value = '';
  recargarLista();
}

function cambiarConcepto() {
  retencionPorcentaje.value = CONCEPTOS[retencionConcepto.value].porcentajes[0];
}

async function guardarFiscal() {
  error.value = '';
  aviso.value = '';
  try {
    const cot = await apiCotizaciones.actualizar(actual.value.id, {
      clienteId: Number(clienteId.value),
      emisorId: emisorId.value || null,
      ivaTarifa: ivaTarifa.value,
      ivaResponsable: ivaResponsable.value,
      retencion: { activada: retencionActiva.value, concepto: retencionConcepto.value, porcentaje: Number(retencionPorcentaje.value) },
      reteiva: { activada: reteivaActivada.value, porcentaje: reteivaPorcentaje.value },
      reteica: { activada: reteicaActivada.value, porcentaje: reteicaPorcentaje.value },
      compensarRetencion: compensarRetencion.value
    });
    actual.value = cot;
    lineasActuales.value = cot.lineas || [];
    emisorId.value = cot.emisor?.id || null;
    aviso.value = 'Cambios guardados.';
  } catch (e) {
    error.value = e.message;
    if (actual.value) cargarFiscal(actual.value);
  }
}

// Se dispara al elegir otro emisor o al guardar la edición de sus datos desde el propio
// editor de la cotización: persiste de inmediato para que el PDF/WhatsApp usen los datos correctos.
async function onEmisorActualizado(emisor) {
  if (!actual.value || !borrador.value) return;
  emisorId.value = emisor ? emisor.id : emisorId.value;
  await guardarFiscal();
  // Si se editó el emisor principal, refresca el perfil local para que el aviso de
  // "perfil fiscal incompleto" se actualice sin necesidad de recargar la página.
  try { perfil.value = await apiPerfil.obtener(); } catch { /* silencioso */ }
}

function elegirServicio() {
  const servicio = servicios.value.find((s) => String(s.id) === String(lineaForm.value.servicioId));
  if (!servicio) return;
  lineaForm.value.descripcion = servicio.nombre;
  lineaForm.value.precioUnitario = servicio.precioDefecto;
}

// T026: agregar línea pre-llenada desde ServicioCatalogoSelector
async function agregarDesdeCatalogo(linea) {
  error.value = '';
  try {
    actual.value = await apiCotizaciones.crearLinea(actual.value.id, {
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      origen: 'catalogo',
      servicioId: linea.servicioId || null
    });
    lineasActuales.value = actual.value.lineas || [];
  } catch (e) {
    error.value = e.message;
  }
}

// T027: guardar línea manual al catálogo (FR-017)
async function guardarLineaAlCatalogo() {
  if (!lineaForm.value.descripcion || !lineaForm.value.precioUnitario) return;
  try {
    const nuevo = await apiCatalogo.crear({
      nombre: lineaForm.value.descripcion,
      precioDefecto: Number(lineaForm.value.precioUnitario),
      cantidadDefecto: Number(lineaForm.value.cantidad) || 1
    });
    servicios.value.push(nuevo);
    aviso.value = `Servicio "${nuevo.nombre}" guardado en el catálogo.`;
  } catch (e) {
    error.value = e.message;
  }
}

function limpiarLinea() {
  lineaForm.value = { descripcion: '', cantidad: 1, precioUnitario: '', servicioId: '' };
  lineaEditandoId.value = null;
}

function editarLinea(linea) {
  lineaEditandoId.value = linea.id;
  lineaForm.value = {
    descripcion: linea.descripcion,
    cantidad: linea.cantidad,
    precioUnitario: linea.precioUnitario,
    servicioId: linea.servicioId || ''
  };
}

async function guardarLinea() {
  error.value = '';
  const datos = {
    descripcion: lineaForm.value.descripcion,
    cantidad: Number(lineaForm.value.cantidad),
    precioUnitario: Number(lineaForm.value.precioUnitario),
    origen: lineaForm.value.servicioId ? 'catalogo' : 'manual',
    servicioId: lineaForm.value.servicioId ? Number(lineaForm.value.servicioId) : null
  };
  try {
    actual.value = lineaEditandoId.value
      ? await apiCotizaciones.actualizarLinea(actual.value.id, lineaEditandoId.value, datos)
      : await apiCotizaciones.crearLinea(actual.value.id, datos);
    lineasActuales.value = actual.value.lineas || [];
    limpiarLinea();
  } catch (e) {
    error.value = e.message;
  }
}

async function eliminarLinea(linea) {
  if (!confirm('¿Quitar esta línea de la cotización?')) return;
  try {
    await apiCotizaciones.eliminarLinea(actual.value.id, linea.id);
    actual.value = await apiCotizaciones.obtener(actual.value.id);
    lineasActuales.value = actual.value.lineas || [];
  } catch (e) {
    error.value = e.message;
  }
}

async function emitir() {
  if (!confirm('Al emitir la cotización ya no podrás modificarla ni eliminarla. ¿Continuar?')) return;
  error.value = '';
  try {
    actual.value = await apiCotizaciones.emitir(actual.value.id);
    aviso.value = 'Cotización emitida. Ya no se puede modificar.';
  } catch (e) {
    error.value = e.message;
  }
}

async function eliminar() {
  if (!confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) return;
  try {
    await apiCotizaciones.eliminar(actual.value.id);
    volverALista();
  } catch (e) {
    error.value = e.message;
  }
}

// Valida lo mínimo antes de intentar guardar/previsualizar/compartir, para no forzar
// el inicio de sesión cuando el motivo del bloqueo es otro (sin líneas o sin cliente).
function validarAntesDeGuardar() {
  if (actual.value) {
    return actual.value.lineas.length === 0 ? 'Agrega al menos una línea antes de continuar.' : null;
  }
  if (!localCliente.value.nombre.trim()) {
    return 'Ingresa el nombre del cliente antes de continuar.';
  }
  if (localLineas.value.length === 0) {
    return 'Agrega al menos una línea antes de continuar.';
  }
  return null;
}

// Convierte la cotización editada localmente (sin backend) en un cliente + cotización
// guardados de verdad, para que vista previa, descarga, guardar y WhatsApp usen siempre
// los mismos datos persistidos. Si ya existe una cotización guardada (actual), la reutiliza.
async function guardarEnBackend() {
  if (actual.value) return actual.value;

  if (!localCliente.value.nombre.trim()) {
    throw new Error('Ingresa el nombre del cliente antes de continuar.');
  }
  if (localLineas.value.length === 0) {
    throw new Error('Agrega al menos una línea antes de continuar.');
  }

  const perfilActual = await apiPerfil.obtener();
  if (localEmisor.value.nombre || localEmisor.value.nit || localEmisor.value.telefono || localEmisor.value.correo) {
    perfil.value = await apiPerfil.guardar({
      nombre: localEmisor.value.nombre || perfilActual.nombre,
      nit: localEmisor.value.nit || perfilActual.nit,
      contacto: localEmisor.value.telefono || localEmisor.value.correo || perfilActual.contacto,
      regimen: perfilActual.regimen,
      logoBase64: perfilActual.logoBase64
    });
  } else {
    perfil.value = perfilActual;
  }

  const clienteCreado = await apiClientes.crear({
    nombre: localCliente.value.nombre,
    documento: localCliente.value.nit || '',
    contacto: localCliente.value.contacto || '',
    tipo: 'persona_juridica',
    agenteRetenedor: localRetencionActiva.value
  });

  let cot = await apiCotizaciones.crear({
    clienteId: clienteCreado.id,
    ivaTarifa: localIvaTarifa.value,
    retencion: localRetencionActiva.value
      ? { activada: true, concepto: 'honorarios', porcentaje: 11 }
      : { activada: false }
  });

  for (const linea of localLineas.value) {
    cot = await apiCotizaciones.crearLinea(cot.id, {
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario,
      origen: 'manual'
    });
  }

  actual.value = cot;
  vistaLista.value = true;
  localLineas.value = [];
  clientes.value = await apiClientes.listar();
  return actual.value;
}

function vistaPrevia() {
  error.value = '';
  const problema = validarAntesDeGuardar();
  if (problema) {
    error.value = problema;
    return;
  }
  requireLogin(async () => {
    // Igual que al compartir por WhatsApp: abrir la pestaña dentro del gesto de
    // clic para que el navegador no la bloquee como pop-up tras el `await`.
    const ventanaPrevia = window.open('', '_blank', 'noopener');
    try {
      const cot = await guardarEnBackend();
      previsualizarPdf(cot, perfil.value, { plantilla: plantillaPdf.value, colores: coloresPdf.value }, ventanaPrevia);
    } catch (e) {
      if (ventanaPrevia) ventanaPrevia.close();
      error.value = e.message;
    }
  });
}

function descargarPdf() {
  error.value = '';
  const problema = validarAntesDeGuardar();
  if (problema) {
    error.value = problema;
    return;
  }
  requireLogin(async () => {
    try {
      const cot = await guardarEnBackend();
      generarPdf(cot, perfil.value, { plantilla: plantillaPdf.value, colores: coloresPdf.value });
    } catch (e) {
      error.value = e.message;
    }
  });
}

function compartirWhatsapp() {
  error.value = '';
  const problema = validarAntesDeGuardar();
  if (problema) {
    error.value = problema;
    return;
  }
  requireLogin(async () => {
    compartiendoWhatsapp.value = true;
    // Abrir la pestaña ya, dentro del gesto de clic original: si se abre recién
    // después de los `await` de abajo, los navegadores de escritorio (que no
    // soportan compartir archivos y caen al enlace wa.me) la bloquean como
    // pop-up sin avisar, y el usuario ve que "no pasa nada" al hacer clic.
    const ventanaWhatsapp = window.open('', '_blank', 'noopener');
    try {
      const cot = await guardarEnBackend();
      const opcionesPdf = { plantilla: plantillaPdf.value, colores: coloresPdf.value };

      // FR-030: intentar compartir el PDF como archivo adjunto (Web Share API Level 2).
      // Si el navegador no soporta compartir archivos (p. ej. escritorio sin esa capacidad),
      // navigator.share igual existiría pero abriría el selector genérico del sistema SIN el
      // PDF adjunto, que es justo el comportamiento confuso que se quiere evitar aquí.
      const archivo = generarPdfArchivo(cot, perfil.value, opcionesPdf);
      const puedeCompartirArchivo = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [archivo] }));

      if (puedeCompartirArchivo) {
        if (ventanaWhatsapp) ventanaWhatsapp.close();
        await navigator.share({
          title: `Cotización ${cot.numero}`,
          text: `Hola, te comparto la cotización Nro. ${cot.numero}.`,
          files: [archivo]
        });
      } else {
        // FR-031: fallback a enlace wa.me con URL de descarga temporal del PDF.
        const pdfBase64 = generarPdfBase64(cot, perfil.value, opcionesPdf);
        const { url } = await apiCompartir.crearEnlace({
          pdfBase64,
          cotizacionId: cot.id,
          nombre: `cotizacion-${cot.numero}.pdf`
        });
        const texto = `Hola, te comparto la cotización Nro. ${cot.numero}: ${url}`;
        const destino = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        if (ventanaWhatsapp) ventanaWhatsapp.location.href = destino;
        else window.open(destino, '_blank', 'noopener');
      }
    } catch (e) {
      if (ventanaWhatsapp) ventanaWhatsapp.close();
      if (e?.name !== 'AbortError') error.value = e.message;
    } finally {
      compartiendoWhatsapp.value = false;
    }
  });
}

function guardarCotizacion() {
  error.value = '';
  const problema = validarAntesDeGuardar();
  if (problema) {
    error.value = problema;
    return;
  }
  requireLogin(async () => {
    guardando.value = true;
    try {
      await guardarEnBackend();
      aviso.value = 'Cotización guardada. Puedes descargarla o compartirla cuando quieras.';
    } catch (e) {
      error.value = e.message;
    } finally {
      guardando.value = false;
    }
  });
}

onMounted(() => {
  if (props.modo === 'lista') {
    vistaLista.value = true;
    cargarTodo();
  }
});

// Este componente se reutiliza entre las rutas "dashboard" y "cotizaciones" (Vue no lo destruye
// al alternar ramas v-if/v-else-if en App.vue), así que un cambio de modo en caliente —p. ej. al
// cerrar sesión— no dispara onMounted. Sin este watch quedarían visibles los datos del usuario
// que acaba de salir.
watch(() => props.modo, (nuevoModo) => {
  if (nuevoModo === 'lista') {
    vistaLista.value = true;
    cargarTodo();
  } else {
    vistaLista.value = false;
    actual.value = null;
    creando.value = false;
    lista.value = [];
    clientes.value = [];
    servicios.value = [];
    perfil.value = {};
    error.value = '';
    aviso.value = '';
  }
});
</script>

<template>
  <section class="page-container page-container--wide">

    <!-- LOCAL EDITOR: cotizador sin login -->
    <template v-if="!vistaLista && !actual && !creando">
      <!-- SEO intro section (FR-038, SC-012) -->
      <section class="seo-intro" aria-label="Acerca de PresupuestosPro">
        <div class="seo-intro__badges">
          <span class="seo-badge seo-badge--dian">
            <span class="seo-badge__dot" aria-hidden="true"></span>
            Normativa DIAN 2026
          </span>
          <span class="seo-badge">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="#475569" stroke-width="1.3"/><path d="M5 4.5h6M5 7.5h1.5M8.5 7.5H10M5 10.5h1.5M8.5 10.5H10" stroke="#475569" stroke-width="1.3" stroke-linecap="round"/></svg>
            Calculadora Fiscal Integrada
          </span>
          <span class="seo-badge seo-badge--estatuto">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5l5.5 2v4c0 3.5-2.3 6.3-5.5 7-3.2-.7-5.5-3.5-5.5-7v-4L8 1.5z" stroke="#4F46E5" stroke-width="1.3" stroke-linejoin="round"/></svg>
            Estatuto Tributario Art. 392
          </span>
        </div>

        <h1 class="seo-intro__titulo">Cotizaciones profesionales para independientes y empresas en Colombia</h1>
        <p class="seo-intro__desc">
          <strong>PresupuestosPro</strong> es la plataforma fiscal de alta precisión diseñada para freelancers, agencias y PyMEs. Genera <em>presupuestos comerciales</em> con discriminación matemática exacta de IVA, retención en la fuente y reteICA territorial según tarifas oficiales. Descarga el PDF al instante y compártelo por WhatsApp con tu cliente.
        </p>

        <ul class="seo-intro__features" aria-label="Beneficios principales">
          <li>
            <span class="seo-feature__icono" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7v2h20V7L12 2z" stroke="#4F46E5" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 10v9M8.5 10v9M15.5 10v9M20 10v9M2 21.5h20" stroke="#4F46E5" stroke-width="1.6" stroke-linecap="round"/></svg>
            </span>
            <div class="seo-feature__texto">
              <strong>Cálculo Tributario Exacto</strong>
              <p>Aplica IVA 19% o 0%, Retefuente por honorarios (11% / 4%) y ReteICA municipal sin errores manuales.</p>
            </div>
          </li>
          <li>
            <span class="seo-feature__icono seo-feature__icono--verde" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8-8 18-2.5-7.5L3 11z" stroke="#16A34A" stroke-width="1.6" stroke-linejoin="round"/></svg>
            </span>
            <div class="seo-feature__texto">
              <strong>Entrega Multicanal</strong>
              <p>Exporta en formato PDF corporativo con QR de validación o envía un link directo vía WhatsApp.</p>
            </div>
          </li>
          <li>
            <span class="seo-feature__icono seo-feature__icono--azul" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="#2563EB" stroke-width="1.6"/><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="#2563EB" stroke-width="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="#2563EB" stroke-width="1.6"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="#2563EB" stroke-width="1.6"/></svg>
            </span>
            <div class="seo-feature__texto">
              <strong>Sincronización de Catálogo</strong>
              <p>Guarda la base de datos de tus clientes con sus NITs y líneas de servicio precargadas para reutilizar.</p>
            </div>
          </li>
          <li>
            <span class="seo-feature__icono seo-feature__icono--teal" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 18h11a4 4 0 0 0 .4-7.98A6 6 0 0 0 7.1 9.1 4.5 4.5 0 0 0 7 18z" stroke="#0D9488" stroke-width="1.6" stroke-linejoin="round"/></svg>
            </span>
            <div class="seo-feature__texto">
              <strong>100% Gratuito y en la Nube</strong>
              <p>Sin suscripción forzada ni instalación de software. Toda la funcionalidad abierta para Colombia.</p>
            </div>
          </li>
        </ul>
      </section>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px">
        <h2 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.03em">Cotiza ahora — gratis</h2>
        <span class="badge gratis">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="vertical-align: -2px; margin-right: 4px"><path d="M5 8l2.5 2.5L11 5.5" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="6.5" stroke="#16A34A" stroke-width="1.5"/></svg>
          100% Gratis
        </span>
      </div>

      <DirectAdSlot espacio-id="banner-superior-cotizaciones" />

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="aviso" class="exito" role="status">{{ aviso }}</p>

      <div class="workspace-split">
        <div class="workspace-col">
          <!-- Emisor + Cliente -->
          <div class="grid-2">
            <div class="card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="#6B7280" stroke-width="1.4"/><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
                Tu información
              </div>
              <div class="card-body" style="display: flex; flex-direction: column; gap: 10px">
                <div>
                  <label class="field-label">Nombre / Razón social</label>
                  <input v-model="localEmisor.nombre" type="text" placeholder="Tu nombre o empresa">
                </div>
                <div>
                  <label class="field-label">NIT / Documento</label>
                  <input v-model="localEmisor.nit" type="text" placeholder="1.234.567.890-1">
                </div>
                <div class="fila-doble">
                  <div>
                    <label class="field-label">Correo</label>
                    <input v-model="localEmisor.correo" type="email" placeholder="tu@correo.com">
                  </div>
                  <div>
                    <label class="field-label">Teléfono</label>
                    <input v-model="localEmisor.telefono" type="tel" placeholder="+57 310 456 7890">
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="#6B7280" stroke-width="1.4"/><path d="M5.5 6.5h5M5.5 9h3" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
                Receptor / Cliente
              </div>
              <div class="card-body" style="display: flex; flex-direction: column; gap: 10px">
                <div>
                  <label class="field-label">Razón social</label>
                  <input v-model="localCliente.nombre" type="text" placeholder="Nombre del cliente">
                </div>
                <div class="fila-doble">
                  <div>
                    <label class="field-label">NIT / Documento</label>
                    <input v-model="localCliente.nit" type="text" placeholder="NIT del cliente">
                  </div>
                  <div>
                    <label class="field-label">Contacto</label>
                    <input v-model="localCliente.contacto" type="text" placeholder="Persona de contacto">
                  </div>
                </div>
                <div class="retencion-toggle">
                  <div style="display: flex; align-items: center; gap: 10px">
                    <input type="checkbox" v-model="localRetencionActiva" style="width: 20px; height: 20px; min-height: auto; accent-color: var(--color-primario)">
                    <span style="font-size: 13px; font-weight: 600; color: #312E81">Retención en la fuente (11%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Services -->
          <div class="card">
            <div class="card-header" style="justify-content: space-between">
              <div style="display: flex; align-items: center; gap: 8px">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="#6B7280" stroke-width="1.4"/><path d="M2 6h12M6 6v8" stroke="#6B7280" stroke-width="1.4"/></svg>
                Servicios
              </div>
              <span style="font-size: 12px; color: var(--color-texto-secundario); font-weight: 500">{{ localLineas.length }} líneas</span>
            </div>

            <table v-if="localLineas.length" class="lineas">
              <thead>
                <tr><th>Descripción</th><th style="text-align: center">Cant.</th><th style="text-align: right">P. Unitario</th><th style="text-align: right">Total</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="linea in localLineas" :key="linea.id">
                  <td style="font-weight: 500">{{ linea.descripcion }}</td>
                  <td style="text-align: center; color: var(--color-texto-secundario)">{{ linea.cantidad }}</td>
                  <td style="text-align: right; color: var(--color-texto-secundario)" class="num-tabular">{{ formato.format(linea.precioUnitario) }}</td>
                  <td style="text-align: right; font-weight: 600" class="num-tabular">{{ formato.format(linea.cantidad * linea.precioUnitario) }}</td>
                  <td style="text-align: right">
                    <button class="btn btn-secondary btn-sm" @click="eliminarLineaLocal(linea.id)">Quitar</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="nota" style="padding: 16px 20px; margin: 0">Agrega servicios a tu cotización.</p>

            <form @submit.prevent="agregarLineaLocal" style="padding: 12px 20px; border-top: 1px dashed var(--color-borde); display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end">
              <div style="flex: 3 1 200px">
                <label class="field-label">Descripción</label>
                <input v-model="lineaForm.descripcion" placeholder="Descripción del servicio" required>
              </div>
              <div style="flex: 1 1 80px">
                <label class="field-label">Cant.</label>
                <input v-model="lineaForm.cantidad" type="number" min="1" step="1" required>
              </div>
              <div style="flex: 1 1 120px">
                <label class="field-label">Precio unitario</label>
                <input v-model="lineaForm.precioUnitario" type="number" min="1" step="1" placeholder="COP" required>
              </div>
              <button class="btn btn-accent" type="submit" style="margin-bottom: 0">+ Agregar</button>
            </form>
          </div>
        </div>

        <div class="workspace-col workspace-col--sticky">
          <!-- Totals as ledger -->
          <div class="ledger">
            <div class="ledger-header">
              <h3>Liquidación financiera</h3>
              <span>COP</span>
            </div>
            <div class="ledger-body">
              <div class="ledger-row">
                <span class="ledger-row__label">Subtotal</span>
                <span class="ledger-row__value num-tabular">{{ formato.format(localSubtotal) }}</span>
              </div>
              <div class="ledger-row">
                <span class="ledger-row__label">IVA ({{ localIvaTarifa }}%)</span>
                <span class="ledger-row__value num-tabular">+ {{ formato.format(localIva) }}</span>
              </div>
              <div class="ledger-row ledger-row--deduccion" v-if="localRetencionActiva">
                <span class="ledger-row__label">− Retención (11%)</span>
                <span class="ledger-row__value num-tabular">− {{ formato.format(localRetencion) }}</span>
              </div>
            </div>
            <div class="ledger-total">
              <span class="ledger-total__label">Total neto</span>
              <span class="ledger-total__value num-tabular">{{ formato.format(localTotal) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="card">
            <div class="card-body" style="display: flex; flex-direction: column; gap: 10px">
              <button class="btn btn-primary" type="button" @click="descargarPdf">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 10.5v3h11v-3M8 2v8M5 7.5L8 10.5 11 7.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Descargar PDF
              </button>
              <button class="btn btn-whatsapp" type="button" :disabled="compartiendoWhatsapp" @click="compartirWhatsapp" title="Compartir por WhatsApp">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A6.5 6.5 0 001.5 8c0 1.14.37 2.2 1 3.06L1.5 14.5l3.54-.94A6.47 6.47 0 008 14.5 6.5 6.5 0 008 1.5z" stroke="white" stroke-width="1.4" stroke-linejoin="round"/></svg>
                {{ compartiendoWhatsapp ? '…' : 'Compartir por WhatsApp' }}
              </button>
              <button class="btn btn-accent" type="button" @click="vistaPrevia">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v12H2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 6h6M5 8.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                Vista previa
              </button>
              <button class="btn btn-secondary" :disabled="guardando" @click="guardarCotizacion">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5v5M5.5 4L8 1.5 10.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 9.5v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ guardando ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- LISTA: mis cotizaciones (requiere login) -->
    <template v-else-if="vistaLista && !actual && !creando">
      <div class="page-header">
        <div>
          <p class="page-eyebrow">Panel comercial</p>
          <h2>Mis cotizaciones</h2>
          <p class="page-header__sub">Historial de cotizaciones, estado y valor total de cada una.</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn-primary" @click="nueva">+ Nueva cotización</button>
        </div>
      </div>

      <DirectAdSlot espacio-id="banner-superior-cotizaciones" />

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="cargando" class="nota">Cargando…</p>

      <template v-else-if="lista.length === 0">
        <p class="nota">Aún no tienes cotizaciones. Crea la primera.</p>
      </template>

      <template v-else>
        <div class="grid-4" style="margin-bottom: 20px">
          <div class="stat-card">
            <div class="stat-card-label">Total cotizado</div>
            <div class="stat-card-value num-tabular">{{ formato.format(statsLista.totalCotizado) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Registros</div>
            <div class="stat-card-value num-tabular">{{ lista.length }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Emitidas</div>
            <div class="stat-card-value num-tabular">{{ statsLista.emitidas }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Borradores en curso</div>
            <div class="stat-card-value num-tabular">{{ statsLista.borradores }}</div>
          </div>
        </div>

        <div class="toolbar-row">
          <div class="filter-tabs">
            <button type="button" class="filter-tab" :class="{ activa: filtroEstado === 'todas' }" @click="filtroEstado = 'todas'">
              Todas <span class="conteo">{{ lista.length }}</span>
            </button>
            <button type="button" class="filter-tab" :class="{ activa: filtroEstado === 'emitida' }" @click="filtroEstado = 'emitida'">
              Emitidas <span class="conteo">{{ statsLista.emitidas }}</span>
            </button>
            <button type="button" class="filter-tab" :class="{ activa: filtroEstado === 'borrador' }" @click="filtroEstado = 'borrador'">
              Borradores <span class="conteo">{{ statsLista.borradores }}</span>
            </button>
          </div>
          <div class="search-input" style="max-width: 320px">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            <input v-model="busquedaLista" type="search" placeholder="Buscar por cliente o N.°…">
          </div>
        </div>

        <div class="card">
          <p v-if="listaFiltrada.length === 0" class="nota" style="padding: 16px 20px; margin: 0">No hay cotizaciones que coincidan con el filtro.</p>
          <table v-else class="lineas">
            <thead>
              <tr>
                <th>N.°</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th style="text-align: right">Valor</th>
                <th style="text-align: center">Estado</th>
                <th style="text-align: right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cot in listaFiltrada" :key="cot.id" style="cursor: pointer" @click="abrir(cot.id)">
                <td style="font-weight: 600; color: var(--color-primario)">{{ cot.numero }}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span class="avatar-chip">{{ iniciales(cot.cliente.nombre) }}</span>
                    {{ cot.cliente.nombre }}
                  </div>
                </td>
                <td style="color: var(--color-texto-secundario)">{{ cot.fechaEmision }}</td>
                <td style="text-align: right; font-weight: 700" class="num-tabular">{{ formato.format(cot.total) }}</td>
                <td style="text-align: center">
                  <span class="pill" :class="cot.estado">{{ cot.estado === 'emitida' ? 'Emitida' : 'Borrador' }}</span>
                </td>
                <td style="text-align: right">
                  <button class="btn btn-secondary btn-sm" @click.stop="abrir(cot.id)">Ver</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- CREAR: elegir cliente -->
    <template v-else-if="creando">
      <h2 style="font-size: 22px; font-weight: 800">Nueva cotización</h2>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <form class="formulario" @submit.prevent="crear" style="max-width: 480px">
        <EmisorSelector
          v-model="emisorId"
          :tipo-cuenta="isPremium ? 'premium' : 'gratuita'"
          @change="onEmisorChange"
        />
        <label>
          <span class="field-label">Cliente</span>
          <ClienteSelector
            ref="clienteSelectorCrear"
            v-model="clienteNuevoSeleccionado"
            @seleccionar="(c) => { nuevaClienteId = c.id }"
          >
            <template #nuevo-cliente>
              <NuevoClienteForm @creado="clienteCreadoEnCrear" />
            </template>
          </ClienteSelector>
        </label>
        <p v-if="clientes.length === 0" class="nota">También puedes registrar un cliente en la pestaña Clientes.</p>
        <button class="btn btn-primary" type="submit" :disabled="!nuevaClienteId">Crear cotización</button>
        <button class="btn btn-secondary" type="button" @click="volverALista">Cancelar</button>
      </form>
    </template>

    <!-- EDITOR: cotización guardada -->
    <template v-else>
      <div class="page-header">
        <div>
          <p class="page-eyebrow">Documento comercial</p>
          <h2>Cotización {{ actual.numero }}</h2>
          <p class="page-header__sub">Emisión: {{ actual.fechaEmision }} · Vigencia hasta: {{ actual.fechaVigencia }} (30 días)</p>
        </div>
        <span class="pill" :class="actual.estado" style="margin-top: 4px">{{ actual.estado === 'emitida' ? 'Emitida' : 'Borrador editable' }}</span>
      </div>

      <p v-if="actual.estado === 'emitida'" class="nota">Cotización emitida: solo lectura.</p>
      <aside v-if="perfilIncompleto" class="aviso-verificacion" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
        <span>Tu perfil fiscal está incompleto (nombre, NIT o régimen). Puedes seguir, pero el PDF saldrá con datos fiscales incompletos.</span>
        <button v-if="cambiarVista" class="btn btn-secondary btn-sm" type="button" @click="cambiarVista('perfil')">Completar perfil fiscal</button>
      </aside>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="aviso" class="exito" role="status">{{ aviso }}</p>

      <div class="workspace-split">
        <div class="workspace-col">
          <fieldset :disabled="!borrador" class="card" style="border: 1px solid var(--color-borde-light); padding: 0">
            <div class="card-header">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="#6B7280" stroke-width="1.4"/><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
              Emisor
            </div>
            <div class="card-body">
              <EmisorSelector
                v-model="emisorId"
                :tipo-cuenta="isPremium ? 'premium' : 'gratuita'"
                @change="onEmisorActualizado"
              />
            </div>
          </fieldset>

          <fieldset :disabled="!borrador" class="card" style="border: 1px solid var(--color-borde-light); padding: 0">
            <div class="card-header">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="#6B7280" stroke-width="1.4"/><path d="M5.5 6.5h5M5.5 9h3" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
              Receptor fiscal / Cliente
            </div>
            <div class="card-body">
              <ClienteSelector
                ref="clienteSelectorEditor"
                :model-value="clienteSeleccionado"
                @seleccionar="(c) => { clienteId = c.id }"
              >
                <template #nuevo-cliente>
                  <NuevoClienteForm @creado="clienteCreadoEnEditor" />
                </template>
              </ClienteSelector>
              <p v-if="clienteSeleccionado" class="nota" style="margin-top: 8px">
                {{ clienteSeleccionado.agenteRetenedor ? 'Agente retenedor de la fuente.' : 'No es agente retenedor: no aplica retención en la fuente.' }}
              </p>
            </div>
          </fieldset>

          <div class="card">
            <div class="card-header" style="justify-content: space-between">
              <div style="display: flex; align-items: center; gap: 8px">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="#6B7280" stroke-width="1.4"/><path d="M2 6h12M6 6v8" stroke="#6B7280" stroke-width="1.4"/></svg>
                Líneas de servicio
              </div>
              <span style="font-size: 12px; color: var(--color-texto-secundario); font-weight: 500">{{ actual.lineas.length }} items</span>
            </div>
            <div v-if="actual.lineas.length" class="lineas-scroll">
              <table class="lineas">
                <thead>
                  <tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Importe</th><th v-if="borrador"></th></tr>
                </thead>
                <tbody>
                  <tr v-for="linea in actual.lineas" :key="linea.id">
                    <td>{{ linea.descripcion }}</td>
                    <td>{{ linea.cantidad }}</td>
                    <td class="num-tabular">{{ formato.format(linea.precioUnitario) }}</td>
                    <td class="num-tabular">{{ formato.format(linea.cantidad * linea.precioUnitario) }}</td>
                    <td v-if="borrador" class="acciones-linea">
                      <button class="btn btn-secondary btn-sm" @click="editarLinea(linea)">Editar</button>
                      <button class="btn btn-danger btn-sm" @click="eliminarLinea(linea)">Quitar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="nota" style="padding: 16px 20px; margin: 0">Esta cotización aún no tiene líneas.</p>

            <form v-if="borrador" class="formulario" style="padding: 12px 20px; border-top: 1px dashed var(--color-borde)" @submit.prevent="guardarLinea">
              <details class="cs-catalogo-details">
                <summary class="cs-catalogo-summary">Desde el catálogo (clic para agregar rápido)</summary>
                <ServicioCatalogoSelector @agregar="agregarDesdeCatalogo" />
              </details>
              <input v-model="lineaForm.descripcion" placeholder="Descripción del servicio" required />
              <div class="fila-doble">
                <input v-model="lineaForm.cantidad" type="number" min="1" step="1" placeholder="Cantidad" required />
                <input v-model="lineaForm.precioUnitario" type="number" min="1" step="1" placeholder="Precio unitario (COP)" required />
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
                <button class="btn btn-primary" type="submit">{{ lineaEditandoId ? 'Guardar línea' : 'Añadir línea' }}</button>
                <button v-if="lineaEditandoId" class="btn btn-secondary" type="button" @click="limpiarLinea">Cancelar edición</button>
                <button v-if="!lineaEditandoId && lineaForm.descripcion" type="button" class="btn btn-secondary" @click="guardarLineaAlCatalogo">Guardar al catálogo</button>
              </div>
            </form>
          </div>

          <DirectAdSlot espacio-id="adsense-editor-cotizacion" />
        </div>

        <div class="workspace-col workspace-col--sticky">
          <fieldset :disabled="!borrador" style="border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px">
            <ConfiguracionImpuestos
              :tipo-emisor="perfil.tipoEmisor || 'persona_natural'"
              :cliente-es-agente-retenedor="clienteElegible"
              :iva-responsable="ivaResponsable"
              :iva-tarifa="ivaTarifa"
              :retencion-activada="retencionActiva"
              :retencion-concepto="retencionConcepto"
              :retencion-porcentaje="retencionPorcentaje"
              :reteiva-activada="reteivaActivada"
              :reteiva-porcentaje="reteivaPorcentaje"
              :reteica-activada="reteicaActivada"
              :reteica-porcentaje="reteicaPorcentaje"
              :compensar-retencion="compensarRetencion"
              @update:config="onConfigImpuestosChange"
            />
            <button v-if="borrador" class="btn btn-secondary" type="button" @click="guardarFiscal">Guardar cliente e impuestos</button>
          </fieldset>

          <DesgloseTotales :totales="totalesActuales" />

          <div class="card">
            <div class="card-header">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="9" rx="1.5" stroke="#6B7280" stroke-width="1.4"/><path d="M2 7h12" stroke="#6B7280" stroke-width="1.4"/></svg>
              Diseño de cotización PDF
            </div>
            <div class="card-body">
              <PlantillaPdfSelector
                v-model="plantillaPdf"
                v-model:colores="coloresPdf"
                :tipo-cuenta="isPremium ? 'premium' : 'gratuita'"
              />
            </div>
          </div>

          <div class="card">
            <div class="card-body" style="display: flex; flex-direction: column; gap: 10px">
              <button class="btn btn-primary" type="button" @click="descargarPdf">Descargar PDF</button>
              <button class="btn btn-whatsapp" type="button" :disabled="compartiendoWhatsapp" @click="compartirWhatsapp">{{ compartiendoWhatsapp ? '…' : 'Compartir por WhatsApp' }}</button>
              <button class="btn btn-accent" type="button" @click="vistaPrevia">Vista previa</button>
              <button v-if="borrador" class="btn btn-secondary" type="button" @click="emitir">Marcar como emitida</button>
              <button v-if="borrador" class="btn btn-danger" type="button" @click="eliminar">Eliminar borrador</button>
              <button class="btn btn-secondary" type="button" @click="volverALista">Volver a mis cotizaciones</button>
            </div>
          </div>
        </div>
      </div>
    </template>

  </section>
</template>

<style scoped>
.seo-intro {
  background: linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%);
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 28px 32px 32px;
  margin-bottom: 24px;
}
.seo-intro__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.seo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radio-full, 9999px);
  background: #fff;
  border: 1px solid var(--color-borde, #e2e8f0);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-texto-secundario, #475569);
}
.seo-badge--dian {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}
.seo-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #059669;
  flex-shrink: 0;
}
.seo-badge--estatuto {
  background: var(--color-primario-light, #eef2ff);
  border-color: var(--color-primario-border, #c7d2fe);
  color: var(--color-primario, #4f46e5);
}
.seo-intro__titulo {
  margin: 0 0 10px;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--color-texto, #0f172a);
  max-width: 720px;
}
.seo-intro__desc {
  margin: 0 0 22px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-texto-secundario, #475569);
  max-width: 680px;
}
.seo-intro__features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.seo-intro__features li {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--color-borde-light, #f1f5f9);
  border-radius: var(--radio-lg, 12px);
  padding: 16px;
}
.seo-feature__icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radio-md, 8px);
  background: var(--color-primario-light, #eef2ff);
  flex-shrink: 0;
}
.seo-feature__icono--verde { background: #ecfdf5; }
.seo-feature__icono--azul { background: #eff6ff; }
.seo-feature__icono--teal { background: #f0fdfa; }
.seo-feature__texto strong {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-texto, #0f172a);
  margin-bottom: 4px;
}
.seo-feature__texto p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--color-texto-secundario, #475569);
}
@media (min-width: 640px) {
  .seo-intro__features {
    grid-template-columns: 1fr 1fr;
  }
}
@media (min-width: 1024px) {
  .seo-intro__features {
    grid-template-columns: repeat(4, 1fr);
  }
}

.lineas-scroll { overflow-x: auto; }

@media (min-width: 1024px) {
  .lineas-scroll table.lineas { min-width: 560px; }
}
</style>
