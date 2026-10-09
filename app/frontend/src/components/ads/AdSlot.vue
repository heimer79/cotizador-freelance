<script setup>
import { inject, ref, onMounted } from 'vue';

const props = defineProps({
  espacio: { type: Object, required: true },
  adsenseClientId: { type: String, default: null }
});

const cookieConsent = inject('cookieConsent', ref(null));
const isPremium = inject('isPremium', ref(false));
const cargado = ref(false);

// El script de AdSense ya está en index.html, pero pausado (pauseAdRequests).
// Los anuncios se muestran siempre a cuentas gratuitas; lo único que decide el
// consentimiento es si son personalizados o no. Solo premium los desactiva.
function mostrar() {
  if (cargado.value || isPremium.value || !props.adsenseClientId || !props.espacio.adsense_slot) return;

  cargado.value = true;
  const adsbygoogle = (window.adsbygoogle = window.adsbygoogle || []);
  adsbygoogle.requestNonPersonalizedAds = cookieConsent.value === true ? 0 : 1;
  adsbygoogle.pauseAdRequests = 0;
  adsbygoogle.push({});
}

onMounted(mostrar);
</script>

<template>
  <div v-if="!isPremium && adsenseClientId && espacio.adsense_slot" class="ad-slot" :data-espacio="espacio.id">
    <ins
      class="adsbygoogle"
      style="display: block"
      :data-ad-client="adsenseClientId"
      :data-ad-slot="espacio.adsense_slot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>
