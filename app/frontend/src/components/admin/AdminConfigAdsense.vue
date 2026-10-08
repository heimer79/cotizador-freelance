<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../api.js';

const adsenseId = ref('');
const guardado = ref('');
const error = ref('');
const cargando = ref(true);

async function cargar() {
  try {
    const r = await admin.config('adsense');
    adsenseId.value = r.config.adsense_id || '';
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

async function guardar() {
  error.value = ''; guardado.value = '';
  try {
    await admin.guardarConfig('adsense', { adsense_id: adsenseId.value });
    guardado.value = 'Configuración guardada.';
  } catch (e) { error.value = e.message; }
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Configuración de Google AdSense</div>
    <div class="card-body">
      <p v-if="cargando" class="nota">Cargando…</p>
      <template v-else>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="guardado" class="exito" role="status">{{ guardado }}</p>
        <form @submit.prevent="guardar" style="display:flex; gap:8px; flex-wrap:wrap">
          <div style="flex:1; min-width:200px">
            <label class="field-label">ID de cliente AdSense (ca-pub-...)</label>
            <input v-model="adsenseId" placeholder="ca-pub-XXXXXXXXXXXXXXXX">
          </div>
          <div style="align-self:flex-end">
            <button class="btn btn-primary" type="submit">Guardar</button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
