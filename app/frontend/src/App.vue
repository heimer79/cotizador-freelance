<script setup>
import { ref, provide, onMounted, onBeforeUnmount } from 'vue';
import NavBar from './components/NavBar.vue';
import LoginModal from './components/LoginModal.vue';
import CotizacionesView from './vistas/CotizacionesView.vue';
import ClientesView from './vistas/ClientesView.vue';
import CatalogoView from './vistas/CatalogoView.vue';
import PerfilView from './vistas/PerfilView.vue';
import CookieConsent from './components/privacy/CookieConsent.vue';
import { useCookieConsent } from './composables/useCookieConsent.js';
import { auth } from './api.js';

const usuario = ref(null);
const cargando = ref(true);
const vistaActiva = ref('cotizaciones');
const mensaje = ref('');
const mostrarLogin = ref(false);
const mostrarDonacion = ref(false);
const tokenRestablecer = ref(null);
const accionPendiente = ref(null);

const { estado: consentimientoAds } = useCookieConsent();
provide('cookieConsent', consentimientoAds);

const params = new URLSearchParams(window.location.search);
const tokenVerificar = params.get('verificar');
const tokenParam = params.get('restablecer');
if (tokenParam) {
  tokenRestablecer.value = tokenParam;
  mostrarLogin.value = true;
}

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

function requireLogin(accion) {
  if (usuario.value) {
    if (accion) accion();
    return true;
  }
  accionPendiente.value = accion;
  mostrarLogin.value = true;
  return false;
}

provide('requireLogin', requireLogin);

function onAutenticado(u) {
  usuario.value = u;
  mostrarLogin.value = false;
  if (accionPendiente.value) {
    accionPendiente.value();
    accionPendiente.value = null;
  }
}

async function cerrarSesion() {
  await auth.logout();
  usuario.value = null;
  vistaActiva.value = 'cotizaciones';
}

function sesionExpirada() {
  usuario.value = null;
  mensaje.value = 'Tu sesión expiró. Vuelve a iniciar sesión.';
}

function cambiarVista(vista) {
  if (vista === 'cotizaciones') {
    vistaActiva.value = vista;
    return;
  }
  requireLogin(() => { vistaActiva.value = vista; });
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
  <NavBar
    :usuario="usuario"
    :vista-activa="vistaActiva"
    @cambiar-vista="cambiarVista"
    @login="mostrarLogin = true"
    @logout="cerrarSesion"
    @donar="mostrarDonacion = !mostrarDonacion"
  />

  <p v-if="mensaje" class="aviso-global page-container" role="status" style="margin-top: 12px">{{ mensaje }}</p>

  <p v-if="cargando" class="nota page-container">Cargando…</p>

  <main v-else>
    <aside v-if="usuario && !usuario.verificado" class="aviso-verificacion page-container" role="status" style="margin-top: 12px">
      <p style="margin: 0">Confirma tu correo electrónico para poder crear cotizaciones, clientes y configurar tu perfil.</p>
      <button class="btn btn-secondary btn-sm" @click="reenviarVerificacion">Reenviar correo de confirmación</button>
    </aside>

    <CotizacionesView v-if="vistaActiva === 'cotizaciones'" />
    <CotizacionesView v-else-if="vistaActiva === 'dashboard'" modo="lista" />
    <ClientesView v-else-if="vistaActiva === 'clientes'" />
    <CatalogoView v-else-if="vistaActiva === 'catalogo'" />
    <PerfilView v-else-if="vistaActiva === 'perfil'" />
  </main>

  <LoginModal
    v-if="mostrarLogin"
    :token-restablecer="tokenRestablecer"
    @autenticado="onAutenticado"
    @cerrar="mostrarLogin = false; accionPendiente = null"
  />

  <CookieConsent />
</template>
