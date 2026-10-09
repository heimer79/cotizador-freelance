import { ref } from 'vue';
import { donaciones } from '../api.js';

// Estado y acciones de donaciones. El cobro lo hace MercadoPago; aquí solo se crea la intención y se lista el historial.
export function useDonation() {
  const historial = ref([]);
  const total = ref(0);
  const error = ref('');
  const cargando = ref(false);

  async function cargarHistorial(pagina = 1) {
    cargando.value = true;
    try {
      const datos = await donaciones.historial(pagina);
      historial.value = datos.donaciones;
      total.value = datos.total;
    } catch (e) {
      error.value = e.message;
    } finally {
      cargando.value = false;
    }
  }

  async function iniciarDonacion(monto) {
    error.value = '';
    try {
      const datos = await donaciones.crear(monto);
      window.location.href = datos.checkout_url;
    } catch (e) {
      error.value = e.message;
    }
  }

  return { historial, total, error, cargando, cargarHistorial, iniciarDonacion };
}
