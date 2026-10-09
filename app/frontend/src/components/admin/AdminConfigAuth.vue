<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../api.js';

const config = ref({ google_oauth_client_id: '', google_oauth_client_secret: '' });
const guardado = ref('');
const error = ref('');
const cargando = ref(true);

async function cargar() {
  try {
    const r = await admin.config('auth_social');
    config.value = { ...config.value, ...r.config };
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

async function guardar() {
  error.value = ''; guardado.value = '';
  try {
    await admin.guardarConfig('auth_social', config.value);
    guardado.value = 'Credenciales guardadas. Reinicia el servidor para aplicar los cambios.';
  } catch (e) { error.value = e.message; }
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Configuración de Autenticación Social</div>
    <div class="card-body">
      <p v-if="cargando" class="nota">Cargando…</p>
      <template v-else>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="guardado" class="exito" role="status">{{ guardado }}</p>
        <form @submit.prevent="guardar" style="display:flex; flex-direction:column; gap:12px">
          <h4 style="margin: 0">Google OAuth</h4>
          <div>
            <label class="field-label">Client ID de Google</label>
            <input v-model="config.google_oauth_client_id" placeholder="XXXXXXXX.apps.googleusercontent.com">
          </div>
          <div>
            <label class="field-label">Client Secret de Google <small style="color:var(--color-texto-secundario)">[sensible]</small></label>
            <input v-model="config.google_oauth_client_secret" type="password" placeholder="GOCSPX-...">
          </div>
          <button class="btn btn-primary" type="submit">Guardar</button>
        </form>
      </template>
    </div>
  </div>
</template>
