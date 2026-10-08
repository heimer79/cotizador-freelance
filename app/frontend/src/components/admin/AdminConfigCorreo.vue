<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../api.js';

const config = ref({ gmail_client_id: '', gmail_client_secret: '', gmail_correo_remitente: '' });
const guardado = ref('');
const error = ref('');
const cargando = ref(true);

async function cargar() {
  try {
    const r = await admin.config('correo');
    config.value = { ...config.value, ...r.config };
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

async function guardar() {
  error.value = ''; guardado.value = '';
  try {
    await admin.guardarConfig('correo', config.value);
    guardado.value = 'Configuración de correo guardada.';
  } catch (e) { error.value = e.message; }
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Configuración de Correo (Gmail API)</div>
    <div class="card-body">
      <p v-if="cargando" class="nota">Cargando…</p>
      <template v-else>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="guardado" class="exito" role="status">{{ guardado }}</p>
        <form @submit.prevent="guardar" style="display:flex; flex-direction:column; gap:12px">
          <div>
            <label class="field-label">Client ID de Gmail API</label>
            <input v-model="config.gmail_client_id" placeholder="XXXXXXXX.apps.googleusercontent.com">
          </div>
          <div>
            <label class="field-label">Client Secret de Gmail API <small style="color:var(--color-texto-secundario)">[sensible]</small></label>
            <input v-model="config.gmail_client_secret" type="password">
          </div>
          <div>
            <label class="field-label">Correo remitente autorizado</label>
            <input v-model="config.gmail_correo_remitente" type="email" placeholder="tu@gmail.com">
          </div>
          <button class="btn btn-primary" type="submit">Guardar</button>
        </form>
      </template>
    </div>
  </div>
</template>
