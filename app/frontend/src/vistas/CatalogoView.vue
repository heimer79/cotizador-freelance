<script setup>
import { ref, onMounted } from 'vue';
import { catalogo as apiCatalogo } from '../api.js';
import DirectAdSlot from '../components/ads/DirectAdSlot.vue';

const lista = ref([]);
const error = ref('');
const editando = ref(null);
const formulario = ref({ nombre: '', precioDefecto: '' });

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

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
  <section class="page-container">
    <div class="cabecera-seccion">
      <h2>Catálogo de servicios</h2>
      <span class="nota">{{ lista.length }} servicios</span>
    </div>

    <DirectAdSlot espacio-id="entre-contenido-catalogo" />

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="grid-2" style="margin-bottom: 24px">
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

      <!-- Lista -->
      <div class="card">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="#6B7280" stroke-width="1.4"/><path d="M2 6h12M6 6v8" stroke="#6B7280" stroke-width="1.4"/></svg>
          Mis servicios
        </div>
        <div v-if="lista.length === 0" class="card-body">
          <p class="nota" style="margin: 0">Aún no tienes servicios en el catálogo.</p>
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
            <tr v-for="servicio in lista" :key="servicio.id">
              <td style="font-weight: 600">{{ servicio.nombre }}</td>
              <td style="text-align: right; font-weight: 700; color: var(--color-primario)">{{ formatoCOP.format(servicio.precioDefecto) }}</td>
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
    </div>
  </section>
</template>
