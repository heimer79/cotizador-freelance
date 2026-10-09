<script setup>
import { ref, provide, onMounted, onBeforeUnmount } from 'vue';
import NavBar from './components/NavBar.vue';
import LoginModal from './components/LoginModal.vue';
import DonationModal from './components/DonationModal.vue';
import CotizacionesView from './vistas/CotizacionesView.vue';
import ClientesView from './vistas/ClientesView.vue';
import CatalogoView from './vistas/CatalogoView.vue';
import PerfilView from './vistas/PerfilView.vue';
import CookieConsent from './components/privacy/CookieConsent.vue';
import AceptacionTerminosModal from './components/legal/AceptacionTerminosModal.vue';
import ToastNotification from './components/ToastNotification.vue';
import AdminView from './vistas/AdminView.vue';
import PlanesView from './vistas/PlanesView.vue';
import LegalView from './vistas/LegalView.vue';
import { useCookieConsent } from './composables/useCookieConsent.js';
import { useAuth } from './composables/useAuth.js';
import { auth, legal as legalApi } from './api.js';

const { usuario, isAdmin, isPremium, setUsuario } = useAuth();
const cargando = ref(true);
const vistaActiva = ref('cotizaciones');
const mensaje = ref('');
const mostrarLogin = ref(false);
const mostrarDonacion = ref(false);
const tokenRestablecer = ref(null);
const accionPendiente = ref(null);
const terminosPendientes = ref([]);
const mostrarTerminos = ref(false);
const toast = ref(null);
const legalTipo = ref('');

const { estado: consentimientoAds } = useCookieConsent();
provide('cookieConsent', consentimientoAds);
provide('toast', toast);
provide('isPremium', isPremium);

const params = new URLSearchParams(window.location.search);
const tokenVerificar = params.get('verificar');
const tokenParam = params.get('restablecer');
const errorAuth = params.get('error');

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

async function verificarTerminosPendientes() {
  if (!usuario.value) return;
  try {
    const { pendientes } = await legalApi.estado();
    if (pendientes && pendientes.length > 0) {
      terminosPendientes.value = pendientes;
      mostrarTerminos.value = true;
    }
  } catch { /* silencioso */ }
}

function onTerminosAceptados() {
  mostrarTerminos.value = false;
  terminosPendientes.value = [];
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
  setUsuario(u);
  mostrarLogin.value = false;
  verificarTerminosPendientes();
  if (accionPendiente.value) {
    accionPendiente.value();
    accionPendiente.value = null;
  }
}

async function cerrarSesion() {
  await auth.logout();
  setUsuario(null);
  vistaActiva.value = 'cotizaciones';
}

function sesionExpirada() {
  setUsuario(null);
  mensaje.value = 'Tu sesión expiró. Vuelve a iniciar sesión.';
}

function cambiarVista(vista) {
  const publicas = ['cotizaciones', 'planes', 'legal'];
  if (publicas.includes(vista)) {
    vistaActiva.value = vista;
    return;
  }
  requireLogin(() => { vistaActiva.value = vista; });
}

function verLegal(tipo) {
  legalTipo.value = tipo;
  vistaActiva.value = 'legal';
}

onMounted(async () => {
  window.addEventListener('sesion-expirada', sesionExpirada);
  try {
    const r = await auth.yo();
    setUsuario(r.usuario);
  } catch {
    setUsuario(null);
  } finally {
    cargando.value = false;
  }

  if (errorAuth) {
    const mensajes = { google_failed: 'No se pudo iniciar sesión con Google.' };
    mensaje.value = mensajes[errorAuth] || 'Error al iniciar sesión.';
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (tokenVerificar && usuario.value) await verificarCorreo();
  else if (tokenVerificar) mensaje.value = 'Inicia sesión para confirmar tu correo.';

  await verificarTerminosPendientes();
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

    <CotizacionesView v-if="vistaActiva === 'cotizaciones'" :modo="usuario ? 'lista' : 'editor'" />
    <CotizacionesView v-else-if="vistaActiva === 'dashboard'" modo="lista" />
    <ClientesView v-else-if="vistaActiva === 'clientes'" />
    <CatalogoView v-else-if="vistaActiva === 'catalogo'" />
    <PerfilView v-else-if="vistaActiva === 'perfil'" />
    <AdminView v-else-if="vistaActiva === 'admin'" />
    <PlanesView v-else-if="vistaActiva === 'planes'" />
    <LegalView v-else-if="vistaActiva === 'legal'" :tipo="legalTipo" />
  </main>

  <footer class="pie-pagina page-container">
    <nav aria-label="Documentos legales">
      <a href="#" @click.prevent="verLegal('privacidad')">Política de Privacidad</a>
      <a href="#" @click.prevent="verLegal('sarlaft')">SARLAFT</a>
      <a href="#" @click.prevent="verLegal('donaciones')">Donaciones</a>
      <a href="#" @click.prevent="verLegal('terminos_uso')">Términos de Uso</a>
      <a href="#" @click.prevent="cambiarVista('planes')">Planes</a>
    </nav>
    <p>Creado por: <a href="https://digitalpymesolutions.dev/" target="_blank" rel="noopener noreferrer">Digital Pyme Solutions (DPS)</a></p>
  </footer>

  <LoginModal
    v-if="mostrarLogin"
    :token-restablecer="tokenRestablecer"
    @autenticado="onAutenticado"
    @cerrar="mostrarLogin = false; accionPendiente = null"
  />

  <AceptacionTerminosModal
    v-if="mostrarTerminos"
    :pendientes="terminosPendientes"
    @aceptado="onTerminosAceptados"
  />

  <DonationModal v-if="mostrarDonacion" @cerrar="mostrarDonacion = false" />

  <ToastNotification ref="toast" />
  <CookieConsent />
</template>

<style scoped>
.pie-pagina {
  margin-top: 2rem;
  padding: 1.5rem 1rem;
  border-top: 1px solid var(--color-borde, #e5e7eb);
  font-size: 0.85rem;
  color: var(--color-texto-secundario, #6b7280);
  text-align: center;
}
.pie-pagina nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  justify-content: center;
  margin-bottom: 0.75rem;
}
.pie-pagina a {
  color: var(--color-texto-secundario, #6b7280);
  text-decoration: none;
}
.pie-pagina a:hover { text-decoration: underline; }
.pie-pagina p { margin: 0; }
</style>
