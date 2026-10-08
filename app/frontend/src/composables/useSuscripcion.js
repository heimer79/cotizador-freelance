import { ref, computed } from 'vue';
import { suscripcion as apiSuscripcion } from '../api.js';

const suscripcionData = ref(null);

const isPremium = computed(() => suscripcionData.value?.estado === 'activa');
const diasRestantes = computed(() => {
  if (!suscripcionData.value?.fecha_vencimiento) return 0;
  const diff = new Date(suscripcionData.value.fecha_vencimiento) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

async function cargar() {
  try {
    suscripcionData.value = await apiSuscripcion.estado();
  } catch {
    suscripcionData.value = null;
  }
}

function showPremiumUpsell(mensaje) {
  window.dispatchEvent(new CustomEvent('premium-upsell', { detail: { mensaje } }));
}

export function useSuscripcion() {
  return {
    suscripcion: suscripcionData,
    isPremium,
    diasRestantes,
    cargar,
    showPremiumUpsell
  };
}
