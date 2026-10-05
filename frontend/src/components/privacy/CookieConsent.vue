<script setup>
import { inject, ref } from 'vue';
import { useCookieConsent } from '../../composables/useCookieConsent.js';

const { estado, decidir } = useCookieConsent();
const decisionGlobal = inject('cookieConsent');

// El banner se muestra mientras el usuario no haya decidido (FR-020).
const visible = ref(estado.value === null);

function responder(aceptaPublicidad) {
  decidir(aceptaPublicidad);
  decisionGlobal.value = aceptaPublicidad;
  visible.value = false;
}
</script>

<template>
  <aside v-if="visible" class="consent-banner" role="dialog" aria-label="Preferencias de cookies">
    <p>
      Usamos cookies de publicidad de Google AdSense para mostrar anuncios. Puedes aceptarlas o rechazarlas;
      PresupuestosPro funciona igual en ambos casos. Los anuncios de pauta directa no usan cookies de terceros.
    </p>
    <div class="consent-acciones">
      <button class="secundario" @click="responder(false)">Rechazar</button>
      <button @click="responder(true)">Aceptar</button>
    </div>
  </aside>
</template>
