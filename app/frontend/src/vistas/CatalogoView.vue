<script setup>
import { ref, computed, onMounted } from 'vue';
import { catalogo as apiCatalogo } from '../api.js';
import DirectAdSlot from '../components/ads/DirectAdSlot.vue';

const lista = ref([]);
const error = ref('');
const editando = ref(null);
const formulario = ref({ nombre: '', precioDefecto: '' });
const busqueda = ref('');

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const listaFiltrada = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return lista.value;
  return lista.value.filter((s) => s.nombre.toLowerCase().includes(q));
});

const statsCatalogo = computed(() => {
  if (lista.value.length === 0) return { promedio: 0, max: 0 };
  const precios = lista.value.map((s) => s.precioDefecto || 0);
  return {
    promedio: Math.round(precios.reduce((a, b) => a + b, 0) / precios.length),
    max: Math.max(...precios)
  };
});

async function cargar() {
  try {
    lista.value = await apiCatalogo.listar();
  } catch (e) {
    error.value = e.message;
  }
}

function nuevoFormulario() {
  editando.value = null;
  formulario.value = { nombre: '', precioDefecto: '' };
}

function editar(servicio) {
  editando.value = servicio.id;
  formulario.value = { nombre: servicio.nombre, precioDefecto: servicio.precioDefecto };
}

async function guardar() {
  error.value = '';
  const datos = { nombre: formulario.value.nombre, precioDefecto: Number(formulario.value.precioDefecto) };
  try {
    if (editando.value) {
      await apiCatalogo.actualizar(editando.value, datos);
    } else {
      await apiCatalogo.crear(datos);
    }
    nuevoFormulario();
    await cargar();
  } catch (e) {
    error.value = e.message;
  }
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este servicio? Las cotizaciones ya creadas no se verán afectadas.')) return;
  try {
    await apiCatalogo.eliminar(id);
    await cargar();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(cargar);
</script>

<template>
  <section class="page-container page-container--wide">
    <div class="page-header">
      <div>
        <p class="page-eyebrow">Gestión comercial</p>
        <h2>Catálogo de servicios y productos</h2>
        <p class="page-header__sub">Tarifas guardadas para agregar a tus cotizaciones con un clic.</p>
      </div>
    </div>

    <DirectAdSlot espacio-id="entre-contenido-catalogo" />

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="grid-4" style="margin-bottom: 20px">
      <div class="stat-card">
        <div class="stat-card-label">Conceptos activos</div>
        <div class="stat-card-value num-tabular">{{ lista.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Tarifa promedio</div>
        <div class="stat-card-value num-tabular">{{ formatoCOP.format(statsCatalogo.promedio) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Tarifa más alta</div>
        <div class="stat-card-value num-tabular">{{ formatoCOP.format(statsCatalogo.max) }}</div>
      </div>
    </div>

    <div class="list-form-split">
      <!-- Lista -->
      <div class="card">
        <div class="card-header" style="justify-content: space-between">
          <div style="display: flex; align-items: center; gap: 8px">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="#6B7280" stroke-width="1.4"/><path d="M2 6h12M6 6v8" stroke="#6B7280" stroke-width="1.4"/></svg>
            Mis servicios
          </div>
          <div class="search-input" style="max-width: 240px">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            <input v-model="busqueda" type="search" placeholder="Buscar servicio…">
          </div>
        </div>
        <div v-if="lista.length === 0" class="card-body">
          <p class="nota" style="margin: 0">Aún no tienes servicios en el catálogo.</p>
        </div>
        <div v-else-if="listaFiltrada.length === 0" class="card-body">
          <p class="nota" style="margin: 0">No hay servicios que coincidan con la búsqueda.</p>
        </div>
        <table v-else class="lineas">
          <thead>
            <tr>
              <th>Servicio</th>
              <th style="text-align: right">Precio</th>
              <th style="text-align: right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="servicio in listaFiltrada" :key="servicio.id">
              <td style="font-weight: 600">{{ servicio.nombre }}</td>
              <td style="text-align: right; font-weight: 700; color: var(--color-primario)" class="num-tabular">{{ formatoCOP.format(servicio.precioDefecto) }}</td>
              <td style="text-align: right">
                <div class="acciones-linea">
                  <button class="btn btn-accent btn-sm" @click="editar(servicio)">Editar</button>
                  <button class="btn btn-danger btn-sm" @click="eliminar(servicio.id)">Eliminar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Formulario -->
      <div class="card">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
          {{ editando ? 'Editar servicio' : 'Nuevo servicio' }}
        </div>
        <form class="card-body" style="display: flex; flex-direction: column; gap: 12px" @submit.prevent="guardar">
          <div>
            <label class="field-label">Nombre del servicio</label>
            <input v-model="formulario.nombre" placeholder="Ej: Diseño de logo" required>
          </div>
          <div>
            <label class="field-label">Precio por defecto (COP)</label>
            <input v-model.number="formulario.precioDefecto" type="number" min="1" step="1" placeholder="Ej: 2500000" required>
          </div>
          <div class="acciones" style="margin: 0">
            <button class="btn btn-primary" type="submit">{{ editando ? 'Guardar cambios' : 'Añadir servicio' }}</button>
            <button v-if="editando" class="btn btn-secondary" type="button" @click="nuevoFormulario">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
