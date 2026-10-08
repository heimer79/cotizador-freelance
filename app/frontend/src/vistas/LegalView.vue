<script setup>
import { ref, watch } from 'vue';
import { legal as legalApi } from '../api.js';

const props = defineProps({
  tipo: { type: String, default: 'privacidad' }
});

const documento = ref(null);
const cargando = ref(false);
const error = ref('');

async function cargar(tipo) {
  if (!tipo) return;
  cargando.value = true;
  error.value = '';
  try {
    const r = await legalApi.documento(tipo);
    documento.value = r?.documento ?? null;
  } catch (e) {
    error.value = e.message;
    documento.value = null;
  } finally {
    cargando.value = false;
  }
}

watch(() => props.tipo, cargar, { immediate: true });
</script>

<template>
  <section class="page-container" style="max-width: 760px; margin: 0 auto">
    <p v-if="cargando" class="nota">Cargando documento…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <article v-else-if="documento">
      <h1>{{ documento.titulo }}</h1>
      <p class="nota" style="margin-bottom: 1.5rem">Versión {{ documento.version }} — publicado {{ new Date(documento.fecha_publicacion).toLocaleDateString('es-CO') }}</p>
      <div class="contenido-legal" v-html="documento.contenido"></div>
    </article>
    <p v-else class="nota">Documento no disponible.</p>
  </section>
</template>

<style scoped>
.contenido-legal { line-height: 1.7; }
.contenido-legal h1, .contenido-legal h2 { margin-top: 1.5rem; }
.contenido-legal p, .contenido-legal li { margin-bottom: 0.75rem; }
</style>
