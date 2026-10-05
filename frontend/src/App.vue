<script setup>
import { ref, provide, onMounted, onBeforeUnmount } from 'vue';
import CotizacionesView from './vistas/CotizacionesView.vue';
import ClientesView from './vistas/ClientesView.vue';
import CatalogoView from './vistas/CatalogoView.vue';
import PerfilView from './vistas/PerfilView.vue';
import AuthView from './vistas/AuthView.vue';
import CookieConsent from './components/privacy/CookieConsent.vue';
import { useCookieConsent } from './composables/useCookieConsent.js';
import { auth } from './api.js';

const usuario = ref(null);
const cargando = ref(true);
const vistaActiva = ref('cotizaciones');
const mensaje = ref('');
const tokenRestablecer = ref(null);

// Estado de consentimiento compartido: AdSlot lo inyecta para decidir si carga AdSense.
const { estado: consentimientoAds } = useCookieConsent();
provide('cookieConsent', consentimientoAds);

const params = new URLSearchParams(window.location.search);
const tokenVerificar = params.get('verificar');
const tokenParam = params.get('restablecer');
if (tokenParam) tokenRestablecer.value = tokenParam;

async function verificarCorreo() {
  try {
    await auth.verificar(tokenVerificar);
    if (usuario.value) usuario.value.verificado = true;
    mensaje.value = 'Tu correo quedó verificado. Ya puedes crear cotizaciones y clientes.';
  } catch (e) {
    mensaje.value = e.message;
  }
  window.history.replaceState({}, '', window.location.pathname);
}

async function reenviarVerificacion() {
  try {
    await auth.reenviarVerificacion();
    mensaje.value = 'Te enviamos un nuevo enlace de verificación.';
  } catch (e) {
    mensaje.value = e.message;
  }
}

async function cerrarSesion() {
  await auth.logout();
  usuario.value = null;
}

function sesionExpirada() {
  usuario.value = null;
  mensaje.value = 'Tu sesión expiró. Vuelve a iniciar sesión.';
}

onMounted(async () => {
  window.addEventListener('sesion-expirada', sesionExpirada);
  try {
    const r = await auth.yo();
    usuario.value = r.usuario;
  } catch {
    usuario.value = null;
  } finally {
    cargando.value = false;
  }

  if (tokenVerificar && usuario.value) await verificarCorreo();
  else if (tokenVerificar) mensaje.value = 'Inicia sesión para confirmar tu correo.';
});

onBeforeUnmount(() => window.removeEventListener('sesion-expirada', sesionExpirada));
</script>

<template>
  <header v-if="usuario" class="cabecera">
    <nav class="tabs">
      <button :class="{ activa: vistaActiva === 'cotizaciones' }" @click="vistaActiva = 'cotizaciones'">Cotizaciones</button>
      <button :class="{ activa: vistaActiva === 'clientes' }" @click="vistaActiva = 'clientes'">Clientes</button>
      <button :class="{ activa: vistaActiva === 'catalogo' }" @click="vistaActiva = 'catalogo'">Catálogo</button>
      <button :class="{ activa: vistaActiva === 'perfil' }" @click="vistaActiva = 'perfil'">Perfil</button>
    </nav>
    <div class="sesion">
      <span>{{ usuario.nombre }}</span>
      <button class="secundario" @click="cerrarSesion">Salir</button>
    </div>
  </header>

  <p v-if="mensaje" class="aviso-global" role="status">{{ mensaje }}</p>

  <p v-if="cargando" class="nota">Cargando…</p>

  <template v-else-if="!usuario">
    <AuthView :token-restablecer="tokenRestablecer" @autenticado="(u) => (usuario = u)" />
  </template>

  <main v-else>
    <aside v-if="!usuario.verificado" class="aviso-verificacion" role="status">
      <p>Confirma tu correo electrónico para poder crear cotizaciones, clientes y configurar tu perfil.</p>
      <button class="secundario" @click="reenviarVerificacion">Reenviar correo de confirmación</button>
    </aside>

    <CotizacionesView v-if="vistaActiva === 'cotizaciones'" />
    <ClientesView v-else-if="vistaActiva === 'clientes'" />
    <CatalogoView v-else-if="vistaActiva === 'catalogo'" />
    <PerfilView v-else-if="vistaActiva === 'perfil'" />
  </main>

  <CookieConsent />
</template>
