<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../api.js';

const config = ref({ mercadopago_enlace_donacion: '', paypal_enlace_donacion: '', mercadopago_access_token: '' });
const guardado = ref('');
const error = ref('');
const cargando = ref(true);

async function cargar() {
  try {
    const r = await admin.config('pasarelas');
    config.value = { ...config.value, ...r.config };
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

async function guardar() {
  error.value = ''; guardado.value = '';
  try {
    await admin.guardarConfig('pasarelas', config.value);
    guardado.value = 'Configuración guardada.';
  } catch (e) { error.value = e.message; }
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Configuración de Pasarelas de Pago</div>
    <div class="card-body">
      <p v-if="cargando" class="nota">Cargando…</p>
      <template v-else>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="guardado" class="exito" role="status">{{ guardado }}</p>
        <form @submit.prevent="guardar" style="display:flex; flex-direction:column; gap:12px">
          <div>
            <label class="field-label">Enlace MercadoPago para donaciones</label>
            <input v-model="config.mercadopago_enlace_donacion" placeholder="https://mpago.la/...">
          </div>
          <div>
            <label class="field-label">Enlace PayPal para donaciones</label>
            <input v-model="config.paypal_enlace_donacion" placeholder="https://paypal.me/...">
          </div>
          <div>
            <label class="field-label">Access Token MercadoPago (suscripciones) <small style="color:var(--color-texto-secundario)">[sensible]</small></label>
            <input v-model="config.mercadopago_access_token" type="password" placeholder="APP_USR-...">
          </div>
          <button class="btn btn-primary" type="submit">Guardar</button>
        </form>
      </template>
    </div>
  </div>
</template>
