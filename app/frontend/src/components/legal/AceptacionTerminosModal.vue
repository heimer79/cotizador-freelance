<script setup>
import { ref } from 'vue';
import { legal as legalApi } from '../../api.js';

const props = defineProps({
  pendientes: { type: Array, default: () => [] }
});
const emit = defineEmits(['aceptado']);

const seleccionados = ref({});
const enviando = ref(false);
const error = ref('');

// Inicializar checkboxes
props.pendientes.forEach((d) => { seleccionados.value[d.id] = false; });

function todosAceptados() {
  return props.pendientes.every((d) => seleccionados.value[d.id]);
}

async function aceptar() {
  if (!todosAceptados()) {
    error.value = 'Debes aceptar todos los documentos legales para continuar.';
    return;
  }
  enviando.value = true;
  error.value = '';
  try {
    const ids = props.pendientes.map((d) => d.id);
    await legalApi.aceptar(ids);
    emit('aceptado');
  } catch (e) {
    error.value = e.message;
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-terminos-titulo">
    <div class="modal-card">
      <h2 id="modal-terminos-titulo" style="margin: 0 0 16px; font-size: 18px; font-weight: 700">
        Actualización de términos legales
      </h2>
      <p style="margin: 0 0 16px; font-size: 14px; color: var(--color-texto-secundario)">
        Para continuar usando PresupuestosPro debes aceptar los siguientes documentos actualizados:
      </p>

      <ul style="list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 12px">
        <li v-for="doc in pendientes" :key="doc.id" style="display: flex; align-items: flex-start; gap: 10px">
          <input
            :id="`doc-${doc.id}`"
            type="checkbox"
            v-model="seleccionados[doc.id]"
            style="margin-top: 3px; flex-shrink: 0; width: 16px; height: 16px; cursor: pointer"
          >
          <label :for="`doc-${doc.id}`" style="cursor: pointer; font-size: 14px">
            He leído y acepto:
            <a :href="`/legal/${doc.tipo}`" target="_blank" style="color: var(--color-primario); font-weight: 600">
              {{ doc.titulo }}
            </a>
          </label>
        </li>
      </ul>

      <p v-if="error" class="error" role="alert" style="margin-bottom: 12px">{{ error }}</p>

      <button
        class="btn btn-primary"
        style="width: 100%"
        :disabled="enviando || !todosAceptados()"
        @click="aceptar"
      >
        {{ enviando ? 'Procesando…' : 'Aceptar y continuar' }}
      </button>
    </div>
  </div>
</template>
