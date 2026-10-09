<template>
  <div v-if="esPremium" class="es-container">
    <label class="es-label">Emisor de la cotización</label>
    <select v-model="seleccionado" class="es-select" @change="onCambio">
      <option v-for="e in emisores" :key="e.id" :value="e.id">
        {{ e.nombre }}{{ e.esPrincipal ? ' (principal)' : '' }}
      </option>
    </select>
    <p v-if="emisorActual" class="es-preview">
      <span v-if="emisorActual.documento">NIT/CC: {{ emisorActual.documento }} · </span>
      {{ emisorActual.tipoEmisor === 'persona_juridica' ? 'Persona jurídica' : 'Persona natural' }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { perfil as apiPerfil } from '../api.js';

const props = defineProps({
  modelValue: { type: Number, default: null },
  tipoCuenta: { type: String, default: 'gratuita' }
});
const emit = defineEmits(['update:modelValue', 'change']);

const emisores = ref([]);
const seleccionado = ref(props.modelValue);

const esPremium = computed(() => props.tipoCuenta === 'premium' || props.tipoCuenta === 'admin');
const emisorActual = computed(() => emisores.value.find(e => e.id === seleccionado.value) || null);

onMounted(async () => {
  if (!esPremium.value) return;
  try {
    const res = await apiPerfil.emisores();
    emisores.value = res || [];
    if (!seleccionado.value && emisores.value.length > 0) {
      const principal = emisores.value.find(e => e.esPrincipal) || emisores.value[0];
      seleccionado.value = principal.id;
      emit('update:modelValue', principal.id);
      emit('change', principal);
    }
  } catch {
    emisores.value = [];
  }
});

function onCambio() {
  emit('update:modelValue', seleccionado.value);
  emit('change', emisorActual.value);
}

defineExpose({ emisores, emisorActual });
</script>

<style scoped>
.es-container { display: flex; flex-direction: column; gap: 0.25rem; }
.es-label { font-size: 0.8rem; font-weight: 500; color: #374151; }
.es-select {
  padding: 0.4rem 0.6rem; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.875rem; background: #fff; cursor: pointer;
}
.es-select:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
.es-preview { font-size: 0.75rem; color: #6b7280; margin: 0; }
</style>
