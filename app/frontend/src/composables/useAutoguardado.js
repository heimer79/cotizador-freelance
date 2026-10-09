import { ref, onMounted, onUnmounted, isRef } from 'vue';

const DEBOUNCE_MS = 5000;

/**
 * Autoguardado dual: localStorage (inmediato) + servidor (debounce 5s).
 * Detecta offline y reintenta al reconectarse (EC-9, FR-027, FR-029, R3).
 *
 * @param {string|Ref<string>} storageKey  - clave única en localStorage para este borrador
 * @param {Function} getData               - función que devuelve el estado actual del borrador
 * @param {Function} saveToApi             - async función que envía el borrador al servidor
 */
export function useAutoguardado(storageKey, getData, saveToApi) {
  function getKey() { return isRef(storageKey) ? storageKey.value : storageKey; }
  const estadoGuardado = ref('idle'); // 'idle' | 'guardando' | 'guardado' | 'error' | 'offline'
  const ultimoGuardadoServidor = ref(null);
  let timerId = null;
  let pendiente = false;

  function guardarEnLocal() {
    try {
      const datos = getData();
      localStorage.setItem(getKey(), JSON.stringify({
        datos,
        timestamp: Date.now()
      }));
    } catch {
      // localStorage puede estar bloqueado en ventana privada
    }
  }

  async function guardarEnServidor() {
    if (!navigator.onLine) {
      estadoGuardado.value = 'offline';
      pendiente = true;
      return;
    }
    try {
      estadoGuardado.value = 'guardando';
      await saveToApi(getData());
      ultimoGuardadoServidor.value = Date.now();
      estadoGuardado.value = 'guardado';
      pendiente = false;
    } catch {
      estadoGuardado.value = 'error';
      pendiente = true;
    }
  }

  function disparar() {
    guardarEnLocal();
    clearTimeout(timerId);
    timerId = setTimeout(guardarEnServidor, DEBOUNCE_MS);
  }

  function leerBorrador() {
    try {
      const raw = localStorage.getItem(getKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function limpiarBorrador() {
    try {
      localStorage.removeItem(getKey());
    } catch {
      // silencioso
    }
  }

  function alReconectar() {
    if (pendiente) {
      guardarEnServidor();
    }
  }

  onMounted(() => {
    window.addEventListener('online', alReconectar);
  });

  onUnmounted(() => {
    clearTimeout(timerId);
    window.removeEventListener('online', alReconectar);
  });

  return {
    estadoGuardado,
    ultimoGuardadoServidor,
    disparar,
    leerBorrador,
    limpiarBorrador,
    guardarEnServidor
  };
}
