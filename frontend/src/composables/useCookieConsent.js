import { ref } from 'vue';

// Preferencia de cookies de publicidad (Ley 1581 de 2012). Vive en localStorage del navegador.
// Valores: true (acepta), false (rechaza), null (aún no ha decidido).
const CLAVE_ADS = 'cookie_consent_ads';
const CLAVE_FECHA = 'cookie_consent_date';

function leerPreferencia() {
  try {
    const valor = localStorage.getItem(CLAVE_ADS);
    if (valor === 'true') return true;
    if (valor === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function guardarPreferencia(aceptaPublicidad) {
  try {
    localStorage.setItem(CLAVE_ADS, String(aceptaPublicidad));
    localStorage.setItem(CLAVE_FECHA, new Date().toISOString());
  } catch {
    // Sin almacenamiento disponible (modo privado): la decisión dura solo esta sesión.
  }
}

export function useCookieConsent() {
  const estado = ref(leerPreferencia());

  function decidir(aceptaPublicidad) {
    guardarPreferencia(aceptaPublicidad);
    estado.value = aceptaPublicidad;
    window.dispatchEvent(new CustomEvent('consent-changed', { detail: aceptaPublicidad }));
  }

  function reiniciar() {
    try {
      localStorage.removeItem(CLAVE_ADS);
      localStorage.removeItem(CLAVE_FECHA);
    } catch {
      // Ignorado: sin almacenamiento no hay preferencia que borrar.
    }
    estado.value = null;
  }

  return { estado, decidir, reiniciar };
}
