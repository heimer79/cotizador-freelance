<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import { cotizaciones as apiCotizaciones, clientes as apiClientes, catalogo as apiCatalogo, perfil as apiPerfil, compartir as apiCompartir } from '../api.js';
import { generarPdf, generarPdfBase64 } from '../pdf.js';
import { useAuth } from '../composables/useAuth.js';
import DirectAdSlot from '../components/ads/DirectAdSlot.vue';

const props = defineProps({
  modo: { type: String, default: 'editor' }
});

const requireLogin = inject('requireLogin');
const toast = inject('toast', null);
const { isPremium } = useAuth();
const compartiendoWhatsapp = ref(false);

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
const vistaLista = ref(props.modo === 'lista');

const borrador = computed(() => !actual.value || actual.value.estado === 'borrador');

const clienteId = ref('');
const ivaTarifa = ref(19);
const retencionActiva = ref(false);
const retencionConcepto = ref('honorarios');
const retencionPorcentaje = ref(11);

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
  ivaTarifa.value = cot.ivaTarifa;
  retencionActiva.value = cot.retencion.activada;
  retencionConcepto.value = cot.retencion.concepto || 'honorarios';
  retencionPorcentaje.value = cot.retencion.porcentaje || CONCEPTOS[retencionConcepto.value].porcentajes[1];
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
    const creada = await apiCotizaciones.crear({ clienteId: Number(nuevaClienteId.value), ivaTarifa: 19, retencion: { activada: false } });
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
      ivaTarifa: ivaTarifa.value,
      retencion: { activada: retencionActiva.value, concepto: retencionConcepto.value, porcentaje: Number(retencionPorcentaje.value) }
    });
    actual.value = cot;
    aviso.value = 'Cambios guardados.';
  } catch (e) {
    error.value = e.message;
    if (actual.value) cargarFiscal(actual.value);
  }
}

function elegirServicio() {
  const servicio = servicios.value.find((s) => String(s.id) === String(lineaForm.value.servicioId));
  if (!servicio) return;
  lineaForm.value.descripcion = servicio.nombre;
  lineaForm.value.precioUnitario = servicio.precioDefecto;
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

function descargarPdf() {
  error.value = '';
  if (actual.value && actual.value.lineas.length === 0) {
    error.value = 'Agrega al menos una línea antes de descargar el PDF.';
    return;
  }
  requireLogin(() => {
    if (actual.value) {
      generarPdf(actual.value, perfil.value);
    }
  });
}

async function compartirWhatsapp() {
  if (!actual.value || actual.value.lineas.length === 0) {
    error.value = 'Agrega al menos una línea antes de compartir.';
    return;
  }
  if (!isPremium.value) {
    window.dispatchEvent(new CustomEvent('premium-upsell', { detail: { mensaje: 'Compartir por WhatsApp requiere cuenta Premium.' } }));
    return;
  }
  requireLogin(async () => {
    compartiendoWhatsapp.value = true;
    try {
      const pdfBase64 = generarPdfBase64 ? generarPdfBase64(actual.value, perfil.value) : null;
      if (!pdfBase64) {
        error.value = 'No se pudo generar el PDF.';
        return;
      }
      const { url } = await apiCompartir.crearEnlace({
        pdfBase64,
        cotizacionId: actual.value.id,
        nombre: `cotizacion-${actual.value.numero}.pdf`
      });
      const texto = encodeURIComponent(`Hola, te comparto la cotización Nro. ${actual.value.numero}: ${url}`);
      window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener');
    } catch (e) {
      error.value = e.message;
    } finally {
      compartiendoWhatsapp.value = false;
    }
  });
}

function guardarCotizacion() {
  requireLogin(() => {
    if (!actual.value) {
      vistaLista.value = true;
      cargarTodo();
    }
  });
}

onMounted(() => {
  if (props.modo === 'lista') {
    vistaLista.value = true;
    cargarTodo();
  }
});
</script>

<template>
  <section class="page-container">

    <!-- LOCAL EDITOR: cotizador sin login -->
    <template v-if="!vistaLista && !actual && !creando">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.03em">Nueva cotización</h1>
        <span class="badge gratis">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="vertical-align: -2px; margin-right: 4px"><path d="M5 8l2.5 2.5L11 5.5" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="6.5" stroke="#16A34A" stroke-width="1.5"/></svg>
          100% Gratis
        </span>
      </div>

      <DirectAdSlot espacio-id="banner-superior-cotizaciones" />

      <!-- Emisor + Cliente grid -->
      <div class="grid-2" style="margin-bottom: 16px">
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
            Cliente
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
      <div class="card" style="margin-bottom: 16px">
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
              <td style="text-align: right; color: var(--color-texto-secundario)">{{ formato.format(linea.precioUnitario) }}</td>
              <td style="text-align: right; font-weight: 600">{{ formato.format(linea.cantidad * linea.precioUnitario) }}</td>
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

      <!-- Totals -->
      <div class="grid-4" style="margin-bottom: 20px">
        <div class="stat-card">
          <div class="stat-card-label">Subtotal</div>
          <div class="stat-card-value">{{ formato.format(localSubtotal) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">IVA ({{ localIvaTarifa }}%)</div>
          <div class="stat-card-value">{{ formato.format(localIva) }}</div>
        </div>
        <div class="stat-card" v-if="localRetencionActiva">
          <div class="stat-card-label">Retención (11%)</div>
          <div class="stat-card-value" style="color: var(--color-peligro)">−{{ formato.format(localRetencion) }}</div>
        </div>
        <div class="stat-card primario">
          <div class="stat-card-label">Total</div>
          <div class="stat-card-value">{{ formato.format(localTotal) }}</div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 2px">COP · Peso colombiano</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="acciones">
        <button class="btn btn-secondary" style="flex: 1 1 120px" @click="guardarCotizacion">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5v5M5.5 4L8 1.5 10.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 9.5v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Guardar
        </button>
        <button class="btn btn-accent" style="flex: 1 1 140px">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v12H2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 6h6M5 8.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          Vista previa
        </button>
        <button class="btn btn-primary" style="flex: 2 1 180px" @click="descargarPdf">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 10.5v3h11v-3M8 2v8M5 7.5L8 10.5 11 7.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Descargar PDF
        </button>
        <button class="btn btn-whatsapp" style="flex: 1 1 120px" :disabled="compartiendoWhatsapp" @click="compartirWhatsapp" :title="isPremium ? 'Compartir por WhatsApp' : 'Requiere cuenta Premium'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A6.5 6.5 0 001.5 8c0 1.14.37 2.2 1 3.06L1.5 14.5l3.54-.94A6.47 6.47 0 008 14.5 6.5 6.5 0 008 1.5z" stroke="white" stroke-width="1.4" stroke-linejoin="round"/></svg>
          {{ compartiendoWhatsapp ? '…' : 'WhatsApp' }}
        </button>
      </div>
    </template>

    <!-- LISTA: mis cotizaciones (requiere login) -->
    <template v-else-if="vistaLista && !actual && !creando">
      <div class="cabecera-seccion">
        <h2>Mis cotizaciones</h2>
        <button class="btn btn-primary" @click="nueva">+ Nueva cotización</button>
      </div>

      <DirectAdSlot espacio-id="banner-superior-cotizaciones" />

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="cargando" class="nota">Cargando…</p>
      <p v-else-if="lista.length === 0" class="nota">Aún no tienes cotizaciones. Crea la primera.</p>

      <div v-else class="card">
        <table class="lineas">
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
            <tr v-for="cot in lista" :key="cot.id" style="cursor: pointer" @click="abrir(cot.id)">
              <td style="font-weight: 600; color: var(--color-primario)">{{ cot.numero }}</td>
              <td>{{ cot.cliente.nombre }}</td>
              <td style="color: var(--color-texto-secundario)">{{ cot.fechaEmision }}</td>
              <td style="text-align: right; font-weight: 700">{{ formato.format(cot.total) }}</td>
              <td style="text-align: center">
                <span class="badge" :class="cot.estado">{{ cot.estado === 'emitida' ? 'Emitida' : 'Borrador' }}</span>
              </td>
              <td style="text-align: right">
                <button class="btn btn-secondary btn-sm" @click.stop="abrir(cot.id)">Ver</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- CREAR: elegir cliente -->
    <template v-else-if="creando">
      <h2 style="font-size: 22px; font-weight: 800">Nueva cotización</h2>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="clientes.length === 0" class="nota">Primero registra un cliente en la pestaña Clientes.</p>
      <form v-else class="formulario" @submit.prevent="crear" style="max-width: 480px">
        <label>
          <span class="field-label">Cliente</span>
          <select v-model="nuevaClienteId" required>
            <option value="" disabled>Elige un cliente</option>
            <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <button class="btn btn-primary" type="submit">Crear cotización</button>
        <button class="btn btn-secondary" type="button" @click="volverALista">Cancelar</button>
      </form>
    </template>

    <!-- EDITOR: cotización guardada -->
    <template v-else>
      <div class="cabecera-seccion">
        <h2>Cotización {{ actual.numero }}</h2>
        <span class="badge" :class="actual.estado">{{ actual.estado === 'emitida' ? 'Emitida' : 'Borrador' }}</span>
      </div>
      <p class="nota">
        Emisión: {{ actual.fechaEmision }} · Vigencia hasta: {{ actual.fechaVigencia }} (30 días)
      </p>
      <p v-if="actual.estado === 'emitida'" class="nota">Cotización emitida: solo lectura.</p>
      <aside v-if="perfilIncompleto" class="aviso-verificacion">
        Tu perfil fiscal está incompleto (nombre, NIT o régimen). Puedes seguir, pero el PDF saldrá con datos fiscales incompletos.
      </aside>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="aviso" class="exito" role="status">{{ aviso }}</p>

      <fieldset :disabled="!borrador" class="bloque">
        <h3 style="margin: 0; font-size: 15px; font-weight: 700">Cliente e impuestos</h3>
        <label>
          <span class="field-label">Cliente</span>
          <select v-model="clienteId">
            <option v-for="c in clientes" :key="c.id" :value="c.id">
              {{ c.nombre }} ({{ c.tipo === 'persona_juridica' ? 'Persona jurídica' : 'Persona natural' }})
            </option>
          </select>
        </label>
        <p v-if="clienteSeleccionado" class="nota">
          {{ clienteSeleccionado.agenteRetenedor ? 'Agente retenedor de la fuente.' : 'No es agente retenedor: no aplica retención en la fuente.' }}
        </p>

        <label>
          <span class="field-label">Tarifa de IVA</span>
          <select v-model="ivaTarifa">
            <option v-for="t in TARIFAS_IVA" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
          </select>
        </label>

        <label class="casilla">
          <input v-model="retencionActiva" type="checkbox" :disabled="!clienteElegible" />
          Aplicar retención en la fuente
        </label>
        <p v-if="!clienteElegible" class="nota">
          Solo aplica a clientes que son agentes retenedores.
        </p>

        <div v-if="retencionActiva" class="fila-doble">
          <label>
            <span class="field-label">Concepto</span>
            <select v-model="retencionConcepto" @change="cambiarConcepto">
              <option v-for="(c, clave) in CONCEPTOS" :key="clave" :value="clave">{{ c.nombre }}</option>
            </select>
          </label>
          <label>
            <span class="field-label">Porcentaje</span>
            <select v-model="retencionPorcentaje">
              <option v-for="p in CONCEPTOS[retencionConcepto].porcentajes" :key="p" :value="p">{{ p }} %</option>
            </select>
          </label>
        </div>

        <button v-if="borrador" class="btn btn-secondary" type="button" @click="guardarFiscal">Guardar cliente e impuestos</button>
      </fieldset>

      <h3 style="font-size: 15px; font-weight: 700">Líneas de servicio</h3>
      <div class="card" style="margin-bottom: 16px">
        <table v-if="actual.lineas.length" class="lineas">
          <thead>
            <tr><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Importe</th><th v-if="borrador"></th></tr>
          </thead>
          <tbody>
            <tr v-for="linea in actual.lineas" :key="linea.id">
              <td>{{ linea.descripcion }}</td>
              <td>{{ linea.cantidad }}</td>
              <td>{{ formato.format(linea.precioUnitario) }}</td>
              <td>{{ formato.format(linea.cantidad * linea.precioUnitario) }}</td>
              <td v-if="borrador" class="acciones-linea">
                <button class="btn btn-secondary btn-sm" @click="editarLinea(linea)">Editar</button>
                <button class="btn btn-danger btn-sm" @click="eliminarLinea(linea)">Quitar</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="nota" style="padding: 16px 20px; margin: 0">Esta cotización aún no tiene líneas.</p>
      </div>

      <form v-if="borrador" class="formulario bloque" @submit.prevent="guardarLinea">
        <label>
          <span class="field-label">Desde el catálogo (opcional)</span>
          <select v-model="lineaForm.servicioId" @change="elegirServicio">
            <option value="">Línea manual</option>
            <option v-for="s in servicios" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </label>
        <input v-model="lineaForm.descripcion" placeholder="Descripción del servicio" required />
        <div class="fila-doble">
          <input v-model="lineaForm.cantidad" type="number" min="1" step="1" placeholder="Cantidad" required />
          <input v-model="lineaForm.precioUnitario" type="number" min="1" step="1" placeholder="Precio unitario (COP)" required />
        </div>
        <button class="btn btn-primary" type="submit">{{ lineaEditandoId ? 'Guardar línea' : 'Añadir línea' }}</button>
        <button v-if="lineaEditandoId" class="btn btn-secondary" type="button" @click="limpiarLinea">Cancelar edición</button>
      </form>

      <section class="totales">
        <p><span>Base gravable</span><strong>{{ formato.format(actual.totales.baseGravable) }}</strong></p>
        <p><span>IVA ({{ actual.ivaTarifa }} %)</span><strong>{{ formato.format(actual.totales.iva) }}</strong></p>
        <p v-if="actual.retencion.activada">
          <span>Retención en la fuente ({{ actual.retencion.porcentaje }} %)</span>
          <strong>−{{ formato.format(actual.totales.retencion) }}</strong>
        </p>
        <p class="total"><span>Total</span><strong>{{ formato.format(actual.totales.total) }}</strong></p>
      </section>

      <DirectAdSlot espacio-id="adsense-editor-cotizacion" />

      <div class="acciones">
        <button class="btn btn-primary" type="button" @click="descargarPdf">Descargar PDF</button>
        <button v-if="borrador" class="btn btn-secondary" type="button" @click="emitir">Marcar como emitida</button>
        <button v-if="borrador" class="btn btn-danger" type="button" @click="eliminar">Eliminar borrador</button>
        <button class="btn btn-secondary" type="button" @click="volverALista">Volver a mis cotizaciones</button>
      </div>
    </template>

  </section>
</template>
