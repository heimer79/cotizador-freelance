<script setup>
import { inject, ref, watch, onMounted } from 'vue';
import { loadAdSense } from '../../services/adsense-loader.js';

const props = defineProps({
  espacio: { type: Object, required: true },
  adsenseClientId: { type: String, default: null }
});

const cookieConsent = inject('cookieConsent', ref(null));
const isPremium = inject('isPremium', ref(false));
const cargado = ref(false);

// AdSense solo se carga con consentimiento y si no es cuenta premium.
async function mostrar() {
  if (cargado.value || cookieConsent.value !== true || isPremium.value || !props.adsenseClientId || !props.espacio.adsense_slot) return;

  try {
    await loadAdSense(props.adsenseClientId);
    cargado.value = true;
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    cargado.value = false;
  }
}

watch(cookieConsent, mostrar);
onMounted(mostrar);
</script>

<template>
  <div v-if="cookieConsent === true && !isPremium && adsenseClientId && espacio.adsense_slot" class="ad-slot" :data-espacio="espacio.id">
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
