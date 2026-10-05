<script setup>
// Botón discreto: no abre ventanas emergentes ni recuerda al usuario (FR-016). Mínimo 44 px (FR-017).
const emit = defineEmits(['abrir']);
</script>

<template>
  <button class="donacion-boton secundario" type="button" @click="emit('abrir')">
    Apoyar PresupuestosPro con una donación
  </button>
</template>
