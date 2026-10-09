<script setup>
import { ref, onMounted } from 'vue';
import { configDonaciones } from '../api.js';

const emit = defineEmits(['cerrar']);

const enlaces = ref({ mercadopago_enlace_donacion: null, paypal_enlace_donacion: null });
const cargando = ref(true);
const error = ref('');

async function cargar() {
  try {
    enlaces.value = await configDonaciones.obtener();
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
}

function cerrarOverlay(e) {
  if (e.target === e.currentTarget) emit('cerrar');
}

onMounted(cargar);
</script>

<template>
  <div class="modal-overlay" @click="cerrarOverlay">
    <div class="modal-card">
      <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 800; text-align: center; letter-spacing: -0.02em">Apóyanos</h2>
      <p style="margin: 0 0 20px; font-size: 14px; color: var(--color-texto-secundario); text-align: center; line-height: 1.5">
        Si Quotizador te resulta útil, puedes apoyar el proyecto con una donación voluntaria.
      </p>

      <p v-if="cargando" class="nota" style="text-align: center">Cargando…</p>
      <p v-else-if="error" class="error" role="alert" style="text-align: center">{{ error }}</p>

      <template v-else>
        <p
          v-if="!enlaces.mercadopago_enlace_donacion && !enlaces.paypal_enlace_donacion"
          class="nota"
          style="text-align: center"
        >Las donaciones no están disponibles en este momento.</p>

        <div v-else style="display: flex; flex-direction: column; gap: 10px">
          <a
            v-if="enlaces.mercadopago_enlace_donacion"
            :href="enlaces.mercadopago_enlace_donacion"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary"
            style="width: 100%; text-align: center; text-decoration: none"
          >Donar con MercadoPago</a>

          <a
            v-if="enlaces.paypal_enlace_donacion"
            :href="enlaces.paypal_enlace_donacion"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondary"
            style="width: 100%; text-align: center; text-decoration: none"
          >Donar con PayPal</a>
        </div>
      </template>

      <button class="btn btn-secondary" type="button" style="width: 100%; margin-top: 16px" @click="emit('cerrar')">Cerrar</button>
    </div>
  </div>
</template>
