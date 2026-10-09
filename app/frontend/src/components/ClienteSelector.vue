<template>
  <div class="cliente-selector">
    <div v-if="clientes.length > 0" class="cs-panel">
      <div class="search-input">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <input
          v-model="busqueda"
          type="search"
          placeholder="Buscar cliente por nombre o documento…"
          @input="onBusqueda"
        />
      </div>

      <div v-if="clientesFiltrados.length > 0" class="cs-list">
        <button
          v-for="c in clientesFiltrados"
          :key="c.id"
          type="button"
          class="cs-item"
          :class="{ 'cs-item--selected': seleccionado?.id === c.id }"
          @click="seleccionar(c)"
        >
          <img v-if="c.logoBase64" :src="c.logoBase64" class="cs-item-logo" alt="" />
          <span v-else class="cs-item-logo cs-item-logo--placeholder">{{ c.nombre[0] }}</span>
          <span class="cs-item-info">
            <span class="cs-item-nombre">{{ c.nombre }}</span>
            <span class="cs-item-doc">{{ c.documento || c.tipo }}</span>
          </span>
        </button>
      </div>
      <p v-else class="cs-empty">No se encontraron clientes</p>

      <div v-if="seleccionado" class="cs-preview">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
          <strong>{{ seleccionado.nombre }}</strong>
          <span v-if="seleccionado.agenteRetenedor" class="pill emitida">Agente retenedor</span>
        </div>
        <span v-if="seleccionado.documento">{{ seleccionado.documento }}</span>
        <span v-if="seleccionado.email">{{ seleccionado.email }}</span>
        <span v-if="seleccionado.telefono">{{ seleccionado.telefono }}</span>
      </div>
    </div>

    <div class="cs-nuevo">
      <button type="button" class="cs-nuevo-btn" @click="toggleNuevo">
        {{ mostrarNuevo ? '▲ Cancelar' : '+ Guardar nuevo cliente' }}
      </button>
      <div v-if="mostrarNuevo" class="cs-nuevo-form">
        <slot name="nuevo-cliente" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { clientes as apiClientes } from '../api.js';

const props = defineProps({
  modelValue: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue', 'seleccionar']);

const clientes = ref([]);
const busqueda = ref('');
const seleccionado = ref(props.modelValue);
const mostrarNuevo = ref(false);

onMounted(async () => {
  try {
    const res = await apiClientes.listar();
    clientes.value = res || [];
  } catch {
    clientes.value = [];
  }
});

const clientesFiltrados = computed(() => {
  if (!busqueda.value.trim()) return clientes.value;
  const q = busqueda.value.trim().toLowerCase();
  return clientes.value.filter(c =>
    c.nombre.toLowerCase().includes(q) ||
    (c.documento || '').toLowerCase().includes(q)
  );
});

function seleccionar(c) {
  seleccionado.value = c;
  emit('update:modelValue', c);
  emit('seleccionar', c);
}

function onBusqueda() {
  // búsqueda local en tiempo real; el backend también soporta ?q=
}

function toggleNuevo() {
  mostrarNuevo.value = !mostrarNuevo.value;
}

function agregarCliente(c) {
  clientes.value.push(c);
  seleccionar(c);
  mostrarNuevo.value = false;
}

defineExpose({ agregarCliente });
</script>

<style scoped>
.cliente-selector { display: flex; flex-direction: column; gap: 0.75rem; }
.cs-list { display: flex; flex-direction: column; gap: 0; max-height: 220px; overflow-y: auto; border: 1px solid var(--color-borde-light, #f1f5f9); border-radius: var(--radio-md, 8px); }
.cs-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.55rem 0.75rem; background: none; border: none;
  cursor: pointer; text-align: left; border-bottom: 1px solid var(--color-borde-light, #f1f5f9);
}
.cs-item:last-child { border-bottom: none; }
.cs-item:hover { background: var(--color-fondo-page, #f8fafc); }
.cs-item--selected { background: var(--color-primario-light, #eef2ff); }
.cs-item-logo { width: 34px; height: 34px; border-radius: var(--radio-sm, 6px); object-fit: contain; }
.cs-item-logo--placeholder {
  width: 34px; height: 34px; border-radius: var(--radio-sm, 6px);
  background: var(--color-primario-light, #eef2ff); display: flex; align-items: center; justify-content: center;
  font-weight: 700; color: var(--color-primario, #4f46e5); font-size: 0.9rem;
}
.cs-item-info { display: flex; flex-direction: column; }
.cs-item-nombre { font-size: 0.875rem; font-weight: 600; }
.cs-item-doc { font-size: 0.75rem; color: var(--color-texto-secundario, #475569); }
.cs-empty { font-size: 0.875rem; color: var(--color-texto-placeholder, #94a3b8); padding: 0.5rem; }
.cs-preview {
  display: flex; flex-direction: column; gap: 0.3rem;
  padding: 0.85rem; background: var(--color-fondo-page, #f8fafc); border: 1px solid var(--color-borde-light, #f1f5f9); border-radius: var(--radio-md, 8px); font-size: 0.875rem;
}
.cs-nuevo-btn {
  background: none; border: 1px dashed var(--color-borde-fuerte, #cbd5e1); border-radius: var(--radio-md, 8px);
  padding: 0.5rem 0.75rem; cursor: pointer; color: var(--color-texto-secundario, #475569); font-size: 0.875rem; font-weight: 500;
}
.cs-nuevo-btn:hover { border-color: var(--color-primario, #4f46e5); color: var(--color-primario, #4f46e5); }
.cs-nuevo-form { margin-top: 0.5rem; }
</style>
