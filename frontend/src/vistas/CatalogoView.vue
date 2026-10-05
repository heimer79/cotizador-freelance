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
  <section>
    <h2>Catálogo de servicios</h2>
    <DirectAdSlot espacio-id="entre-contenido-catalogo" />
    <p v-if="error" style="color: var(--color-peligro)">{{ error }}</p>

    <form @submit.prevent="guardar" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px">
      <input v-model="formulario.nombre" placeholder="Nombre del servicio" required />
      <input v-model.number="formulario.precioDefecto" type="number" min="1" step="1" placeholder="Precio por defecto (COP)" required />
      <button type="submit">{{ editando ? 'Guardar cambios' : 'Añadir servicio' }}</button>
      <button v-if="editando" type="button" class="secundario" @click="nuevoFormulario">Cancelar</button>
    </form>

    <ul style="list-style: none; padding: 0">
      <li v-for="servicio in lista" :key="servicio.id" style="padding: 8px 0; border-bottom: 1px solid var(--color-borde)">
        <strong>{{ servicio.nombre }}</strong> — {{ formatoCOP.format(servicio.precioDefecto) }}
        <div style="display: flex; gap: 8px; margin-top: 4px">
          <button class="secundario" @click="editar(servicio)">Editar</button>
          <button class="peligro" @click="eliminar(servicio.id)">Eliminar</button>
        </div>
      </li>
    </ul>
  </section>
</template>
