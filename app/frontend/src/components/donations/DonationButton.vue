<script setup>
const emit = defineEmits(['abrir']);
</script>

<template>
  <button class="btn-donation" type="button" @click="emit('abrir')">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 018 4.5 3.5 3.5 0 0113.5 7C13.5 10.5 8 14 8 14z" fill="#E11D48"/></svg>
    Apoyar Quotizador
  </button>
</template>
