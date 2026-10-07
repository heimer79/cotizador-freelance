<script setup>
defineProps({
  usuario: { type: Object, default: null },
  vistaActiva: { type: String, default: 'cotizaciones' }
});

const emit = defineEmits(['cambiarVista', 'login', 'logout', 'donar']);

function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
</script>

<template>
  <div class="accent-bar"></div>
  <nav class="navbar">
    <a class="navbar-logo" href="#" @click.prevent="emit('cambiarVista', 'cotizaciones')">
      <div class="navbar-logo-icon">Q</div>
      <div class="navbar-logo-text">Quoti<span>zador</span></div>
    </a>

    <div class="navbar-nav">
      <button :class="{ activa: vistaActiva === 'cotizaciones' }" @click="emit('cambiarVista', 'cotizaciones')">Cotizador</button>
      <button v-if="usuario" :class="{ activa: vistaActiva === 'dashboard' }" @click="emit('cambiarVista', 'dashboard')">Mis cotizaciones</button>
      <button v-if="usuario" :class="{ activa: vistaActiva === 'clientes' }" @click="emit('cambiarVista', 'clientes')">Clientes</button>
      <button v-if="usuario" :class="{ activa: vistaActiva === 'catalogo' }" @click="emit('cambiarVista', 'catalogo')">Catálogo</button>
      <button v-if="usuario" :class="{ activa: vistaActiva === 'perfil' }" @click="emit('cambiarVista', 'perfil')">Perfil</button>
    </div>

    <div class="navbar-actions">
      <button class="btn-donation" type="button" @click="emit('donar')">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 018 4.5 3.5 3.5 0 0113.5 7C13.5 10.5 8 14 8 14z" fill="#E11D48"/></svg>
        Apóyanos
      </button>
      <div class="navbar-divider"></div>
      <template v-if="usuario">
        <button class="btn btn-secondary btn-sm" @click="emit('logout')">Salir</button>
        <div class="navbar-avatar">{{ iniciales(usuario.nombre) }}</div>
      </template>
      <button v-else class="btn btn-primary" @click="emit('login')">Iniciar sesión</button>
    </div>
  </nav>
</template>
