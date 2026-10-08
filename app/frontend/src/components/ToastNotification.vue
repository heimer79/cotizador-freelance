<script setup>
import { ref } from 'vue';

const toasts = ref([]);
let nextId = 0;

function mostrar({ mensaje, tipo = 'exito', duracion = null }) {
  const id = ++nextId;
  const autoClose = duracion !== null ? duracion : (tipo === 'error' ? 0 : 5000);
  toasts.value.push({ id, mensaje, tipo });
  if (autoClose > 0) {
    setTimeout(() => cerrar(id), autoClose);
  }
}

function cerrar(id) {
  const idx = toasts.value.findIndex((t) => t.id === id);
  if (idx !== -1) toasts.value.splice(idx, 1);
}

defineExpose({ mostrar });
</script>

<template>
  <div
    class="toast-container"
    role="status"
    aria-live="polite"
    aria-atomic="false"
  >
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="`toast--${t.tipo}`"
    >
      <span class="toast__mensaje">{{ t.mensaje }}</span>
      <button
        class="toast__cerrar"
        aria-label="Cerrar notificación"
        @click="cerrar(t.id)"
      >×</button>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: calc(100vw - 2rem);
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  animation: toast-in 0.2s ease;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.toast--exito { background: #1e7e34; color: #fff; }
.toast--error { background: #c82333; color: #fff; }
.toast--cargando { background: #0069d9; color: #fff; }

.toast__mensaje { flex: 1; }

.toast__cerrar {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
  opacity: 0.8;
}
.toast__cerrar:hover { opacity: 1; }
</style>
