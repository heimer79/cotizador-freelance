<template>
  <div class="scs-container">
    <p v-if="catalogo.length === 0" class="scs-empty">No tienes servicios en el catálogo aún.</p>
    <div v-else>
      <p class="scs-hint">Haz clic en un servicio para agregarlo a la cotización:</p>
      <div class="scs-list">
        <button
          v-for="s in catalogo"
          :key="s.id"
          type="button"
          class="scs-item"
          @click="agregar(s)"
        >
          <span class="scs-item-nombre">{{ s.nombre }}</span>
          <span v-if="s.descripcion" class="scs-item-desc">{{ s.descripcion }}</span>
          <span class="scs-item-precio">{{ fmt(s.precioDefecto) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { catalogo as apiCatalogo } from '../api.js';

const emit = defineEmits(['agregar']);

const catalogo = ref([]);
const formato = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
function fmt(v) { return formato.format(v || 0); }

onMounted(async () => {
  try {
    const res = await apiCatalogo.listar();
    catalogo.value = res || [];
  } catch {
    catalogo.value = [];
  }
});

function agregar(servicio) {
  // Emite una línea pre-llenada; la cantidad es editable por-cotización (FR-015, FR-016)
  emit('agregar', {
    descripcion: servicio.nombre + (servicio.descripcion ? ': ' + servicio.descripcion : ''),
    cantidad: servicio.cantidadDefecto || 1,
    precioUnitario: servicio.precioDefecto,
    servicioId: servicio.id,
    origen: 'catalogo'
  });
}
</script>

<style scoped>
.scs-container { padding: 0.5rem 0; }
.scs-hint { font-size: 0.8rem; color: #6b7280; margin-bottom: 0.5rem; }
.scs-empty { font-size: 0.875rem; color: #9ca3af; }
.scs-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 220px; overflow-y: auto; }
.scs-item {
  display: flex; align-items: baseline; gap: 0.5rem;
  padding: 0.5rem 0.75rem; background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 6px; cursor: pointer; text-align: left;
}
.scs-item:hover { background: #eff6ff; border-color: #bfdbfe; }
.scs-item-nombre { font-size: 0.875rem; font-weight: 500; flex: 1; }
.scs-item-desc { font-size: 0.75rem; color: #6b7280; flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scs-item-precio { font-size: 0.875rem; font-weight: 600; color: #1d4ed8; margin-left: auto; white-space: nowrap; }
</style>
