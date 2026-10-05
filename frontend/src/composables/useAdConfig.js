import { ref } from 'vue';
import { configAds } from '../api.js';

// Configuración de espacios publicitarios, pedida una sola vez por carga de página.
const configuracion = ref(null);
let peticion = null;

export function useAdConfig() {
  if (!peticion) {
    peticion = configAds
      .obtener()
      .then((datos) => {
        configuracion.value = datos;
        return datos;
      })
      .catch(() => {
        // Si la configuración no carga, la plataforma sigue funcionando sin anuncios (EC2, EC7).
        configuracion.value = { espacios: [], adsense_client_id: null };
        return configuracion.value;
      });
  }
  return { configuracion, listo: peticion };
}
