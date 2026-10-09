<template>
  <div class="pps-container">
    <label class="pps-label">Plantilla PDF</label>
    <div class="pps-grid">
      <button
        v-for="p in plantillasVisibles"
        :key="p.id"
        type="button"
        class="pps-item"
        :class="{ selected: seleccionada === p.nombre.toLowerCase(), bloqueada: p.soloPremium && !esPremium }"
        @click="elegir(p)"
        :title="p.soloPremium && !esPremium ? 'Requiere cuenta premium' : ''"
      >
        <span class="pps-nombre">{{ p.nombre }}</span>
        <span v-if="p.soloPremium" class="pps-badge">Premium</span>
        <span class="pps-desc">{{ p.descripcion }}</span>
      </button>
    </div>

    <div v-if="esPremium && seleccionada && seleccionada !== 'profesional'" class="pps-colores">
      <label class="pps-label" style="margin-top: 0.75rem">Colores personalizados</label>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.25rem">
        <label class="pps-color-item">
          <span class="field-label">Encabezado</span>
          <input type="color" :value="colores.encabezado || '#1e3a5f'" @input="cambiarColor('encabezado', $event.target.value)">
        </label>
        <label class="pps-color-item">
          <span class="field-label">Acento</span>
          <input type="color" :value="colores.acento || '#2563eb'" @input="cambiarColor('acento', $event.target.value)">
        </label>
        <label class="pps-color-item">
          <span class="field-label">Texto</span>
          <input type="color" :value="colores.texto || '#374151'" @input="cambiarColor('texto', $event.target.value)">
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { plantillasPdf as apiPlantillas } from '../api.js';

const props = defineProps({
  modelValue: { type: String, default: 'profesional' },
  colores: { type: Object, default: () => ({}) },
  tipoCuenta: { type: String, default: 'gratuita' }
});
const emit = defineEmits(['update:modelValue', 'update:colores']);

const plantillas = ref([]);
const seleccionada = ref(props.modelValue);

const esPremium = computed(() => props.tipoCuenta === 'premium' || props.tipoCuenta === 'admin');
const plantillasVisibles = computed(() => {
  if (!plantillas.value.length) {
    return [{ id: 1, nombre: 'Profesional', descripcion: 'Diseño limpio y profesional', soloPremium: false }];
  }
  return plantillas.value;
});

onMounted(async () => {
  try {
    const res = await apiPlantillas.listar();
    plantillas.value = res || [];
  } catch {
    plantillas.value = [
      { id: 1, nombre: 'Profesional', descripcion: 'Diseño limpio y profesional', soloPremium: false },
      { id: 2, nombre: 'Moderna', descripcion: 'Barra lateral y tipografía moderna', soloPremium: true },
      { id: 3, nombre: 'Ejecutiva', descripcion: 'Encabezado corporativo en dos columnas', soloPremium: true }
    ];
  }
});

function elegir(p) {
  if (p.soloPremium && !esPremium.value) return;
  seleccionada.value = p.nombre.toLowerCase();
  emit('update:modelValue', seleccionada.value);
}

function cambiarColor(campo, valor) {
  emit('update:colores', { ...props.colores, [campo]: valor });
}
</script>

<style scoped>
.pps-container { display: flex; flex-direction: column; }
.pps-label { font-size: 0.8rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
.pps-grid { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.pps-item {
  position: relative; display: flex; flex-direction: column; align-items: flex-start;
  padding: 0.6rem 0.75rem; min-width: 110px; background: #f9fafb;
  border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; text-align: left;
  transition: border-color 0.15s;
}
.pps-item:hover:not(.bloqueada) { border-color: #6366f1; background: #eff6ff; }
.pps-item.selected { border-color: #6366f1; background: #eef2ff; }
.pps-item.bloqueada { opacity: 0.55; cursor: not-allowed; }
.pps-nombre { font-size: 0.875rem; font-weight: 600; }
.pps-desc { font-size: 0.72rem; color: #6b7280; margin-top: 2px; }
.pps-badge {
  font-size: 0.65rem; font-weight: 600; background: #fef3c7; color: #92400e;
  border-radius: 4px; padding: 1px 5px; margin-top: 2px;
}
.pps-colores { display: flex; flex-direction: column; }
.pps-color-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.pps-color-item input[type=color] { width: 48px; height: 32px; padding: 2px; border: 1px solid #d1d5db; border-radius: 5px; cursor: pointer; }
</style>
