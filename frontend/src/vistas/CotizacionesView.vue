<script setup>
import { ref, computed, onMounted } from 'vue';
import { cotizaciones as apiCotizaciones, clientes as apiClientes, catalogo as apiCatalogo, perfil as apiPerfil } from '../api.js';
import { generarPdf } from '../pdf.js';
import DirectAdSlot from '../components/ads/DirectAdSlot.vue';

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

// Cotización abierta en el editor. null = pantalla de lista.
const actual = ref(null);
const creando = ref(false);
const nuevaClienteId = ref('');

const borrador = computed(() => !actual.value || actual.value.estado === 'borrador');

// Configuración fiscal editable.
const clienteId = ref('');
const ivaTarifa = ref(19);
const retencionActiva = ref(false);
const retencionConcepto = ref('honorarios');
const retencionPorcentaje = ref(11);

// Línea en edición o alta.
const lineaForm = ref({ descripcion: '', cantidad: 1, precioUnitario: '', servicioId: '' });
const lineaEditandoId = ref(null);

const clienteSeleccionado = computed(() => clientes.value.find((c) => String(c.id) === String(clienteId.value)));
const clienteElegible = computed(() => !!(clienteSeleccionado.value && clienteSeleccionado.value.agenteRetenedor));
const perfilIncompleto = computed(() => !perfil.value.nit || !perfil.value.nombre || !perfil.value.regimen);

function cargarFiscal(cot) {
  clienteId.value = cot.cliente.id;
  ivaTarifa.value = cot.ivaTarifa;
  retencionActiva.value = cot.retencion.activada;
  retencionConcepto.value = cot.retencion.concepto || 'honorarios';
  retencionPorcentaje.value = cot.retencion.porcentaje || CONCEPTOS[retencionConcepto.value].porcentajes[1];
}

function abrirEditor(cot) {
  actual.value = cot;
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

// Guarda IVA, cliente y retención. El servidor valida que la retención sea procedente.
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

// Elegir un servicio del catálogo precarga la línea; el origen queda registrado.
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
  if (actual.value.lineas.length === 0) {
    error.value = 'Agrega al menos una línea antes de descargar el PDF.';
    return;
  }
  generarPdf(actual.value, perfil.value);
}

onMounted(cargarTodo);
</script>

<template>
  <section>
    <!-- Vista de lista -->
    <template v-if="!actual && !creando">
      <div class="cabecera-seccion">
        <h2>Mis cotizaciones</h2>
        <button @click="nueva">Nueva cotización</button>
      </div>

      <DirectAdSlot espacio-id="banner-superior-cotizaciones" />

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="cargando" class="nota">Cargando…</p>
      <p v-else-if="lista.length === 0" class="nota">Aún no tienes cotizaciones. Crea la primera.</p>

      <ul v-else class="lista">
        <li v-for="cot in lista" :key="cot.id">
          <button class="fila secundario" @click="abrir(cot.id)">
            <span><strong>{{ cot.numero }}</strong> · {{ cot.cliente.nombre }}</span>
            <span class="badge" :class="cot.estado">{{ cot.estado === 'emitida' ? 'Emitida' : 'Borrador' }}</span>
            <strong>{{ formato.format(cot.total) }}</strong>
          </button>
        </li>
      </ul>
    </template>

    <!-- Nueva cotización: elegir cliente -->
    <template v-else-if="creando">
      <h2>Nueva cotización</h2>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="clientes.length === 0" class="nota">Primero registra un cliente en la pestaña Clientes.</p>
      <form v-else class="formulario" @submit.prevent="crear">
        <label>
          Cliente
          <select v-model="nuevaClienteId" required>
            <option value="" disabled>Elige un cliente</option>
            <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <button type="submit">Crear cotización</button>
        <button type="button" class="secundario" @click="volverALista">Cancelar</button>
      </form>
    </template>

    <!-- Editor -->
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
        <h3>Cliente e impuestos</h3>
        <label>
          Cliente
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
          Tarifa de IVA (aplica a toda la cotización)
          <select v-model="ivaTarifa">
            <option v-for="t in TARIFAS_IVA" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
          </select>
        </label>

        <label class="casilla">
          <input v-model="retencionActiva" type="checkbox" :disabled="!clienteElegible" />
          Aplicar retención en la fuente
        </label>
        <p v-if="!clienteElegible" class="nota">
          Solo aplica a clientes que son agentes retenedores. Marca esa opción en el cliente para habilitarla.
        </p>

        <div v-if="retencionActiva" class="fila-doble">
          <label>
            Concepto
            <select v-model="retencionConcepto" @change="cambiarConcepto">
              <option v-for="(c, clave) in CONCEPTOS" :key="clave" :value="clave">{{ c.nombre }}</option>
            </select>
          </label>
          <label>
            Porcentaje
            <select v-model="retencionPorcentaje">
              <option v-for="p in CONCEPTOS[retencionConcepto].porcentajes" :key="p" :value="p">{{ p }} %</option>
            </select>
          </label>
        </div>

        <button v-if="borrador" type="button" class="secundario" @click="guardarFiscal">Guardar cliente e impuestos</button>
      </fieldset>

      <h3>Líneas de servicio</h3>
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
              <button class="secundario" @click="editarLinea(linea)">Editar</button>
              <button class="peligro" @click="eliminarLinea(linea)">Quitar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="nota">Esta cotización aún no tiene líneas.</p>

      <form v-if="borrador" class="formulario bloque" @submit.prevent="guardarLinea">
        <label>
          Desde el catálogo (opcional)
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
        <button type="submit">{{ lineaEditandoId ? 'Guardar línea' : 'Añadir línea' }}</button>
        <button v-if="lineaEditandoId" type="button" class="secundario" @click="limpiarLinea">Cancelar edición</button>
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
        <button type="button" @click="descargarPdf">Descargar PDF</button>
        <button v-if="borrador" type="button" class="secundario" @click="emitir">Marcar como emitida</button>
        <button v-if="borrador" type="button" class="peligro" @click="eliminar">Eliminar borrador</button>
        <button type="button" class="secundario" @click="volverALista">Volver a mis cotizaciones</button>
      </div>
    </template>
  </section>
</template>
