<script setup>
import { computed } from 'vue';
import { useAdConfig } from '../../composables/useAdConfig.js';
import AdSlot from './AdSlot.vue';

const props = defineProps({
  espacioId: { type: String, required: true }
});

const { configuracion } = useAdConfig();

const espacio = computed(() =>
  configuracion.value ? configuracion.value.espacios.find((e) => e.id === props.espacioId && e.activo) : null
);

const contratado = computed(() => espacio.value && espacio.value.tipo === 'pauta_directa' && espacio.value.anunciante);
const usaAdsense = computed(() => espacio.value && espacio.value.fallback === 'adsense');
</script>

<template>
  <div v-if="espacio" class="ad-slot" :data-espacio="espacio.id">
    <!-- Pauta directa: no usa cookies de terceros, así que se muestra sin importar el consentimiento (FR-024). -->
    <a
      v-if="contratado"
      :href="espacio.anunciante.enlace_url"
      target="_blank"
      rel="noopener sponsored"
      class="pauta-directa"
    >
      <img :src="espacio.anunciante.imagen_url" :alt="espacio.anunciante.alt" loading="lazy" />
    </a>
    <AdSlot
      v-else-if="usaAdsense"
      :espacio="espacio"
      :adsense-client-id="configuracion.adsense_client_id"
    />
  </div>
</template>
