<script setup>
import { ref, onMounted, inject } from 'vue';
import { perfil as apiPerfil, auth as apiAuth, suscripcion as apiSuscripcion } from '../api.js';
import { useAuth } from '../composables/useAuth.js';
import { useCookieConsent } from '../composables/useCookieConsent.js';
import DonationButton from '../components/donations/DonationButton.vue';
import DonationForm from '../components/donations/DonationForm.vue';
import DonationHistory from '../components/donations/DonationHistory.vue';
import DirectAdSlot from '../components/ads/DirectAdSlot.vue';

const REGIMENES = [
  { valor: 'ordinario', etiqueta: 'Régimen ordinario' },
  { valor: 'simple', etiqueta: 'Régimen simple de tributación (SIMPLE)' },
  { valor: 'no_responsable_iva', etiqueta: 'No responsable de IVA' }
];

const MAX_LOGO_BYTES = 1024 * 1024;

const { usuario, proveedores } = useAuth();
const formulario = ref({ nombre: '', nit: '', contacto: '', logoBase64: '', regimen: '' });
const error = ref('');
const aviso = ref('');
const guardado = ref('');
const mostrarDonacion = ref(false);
const nuevaPasswordPerfil = ref('');
const passwordGuardado = ref('');
const passwordError = ref('');
const estadoSuscripcion = ref(null);
const historialActividad = ref([]);

const { estado: consentimiento, decidir, reiniciar } = useCookieConsent();

async function cargar() {
  try {
    const datos = await apiPerfil.obtener();
    formulario.value = { ...formulario.value, ...datos };
  } catch (e) {
    error.value = e.message;
  }
}

function cambiarLogo(evento) {
  const archivo = evento.target.files[0];
  if (!archivo) return;

  if (archivo.size > MAX_LOGO_BYTES) {
    aviso.value = 'El logo supera 1 MB; elige una imagen más liviana.';
    evento.target.value = '';
    return;
  }

  aviso.value = '';
  const lector = new FileReader();
  lector.onload = () => {
    formulario.value.logoBase64 = lector.result;
  };
  lector.readAsDataURL(archivo);
}

async function guardar() {
  error.value = '';
  guardado.value = '';
  try {
    await apiPerfil.guardar(formulario.value);
    guardado.value = 'Perfil guardado. Las cotizaciones en borrador tomarán estos datos.';
  } catch (e) {
    error.value = e.message;
  }
}

function cambiarPreferencia(aceptar) {
  decidir(aceptar);
  window.location.reload();
}

function restablecerPreferencia() {
  reiniciar();
  window.location.reload();
}

async function establecerPassword() {
  passwordError.value = '';
  passwordGuardado.value = '';
  try {
    await apiAuth.establecerPassword(nuevaPasswordPerfil.value);
    passwordGuardado.value = 'Contraseña establecida correctamente.';
    nuevaPasswordPerfil.value = '';
  } catch (e) {
    passwordError.value = e.message;
  }
}

async function cargarSuscripcion() {
  if (!usuario.value) return;
  try {
    estadoSuscripcion.value = await apiSuscripcion.estado();
  } catch { /* silencioso */ }
}

async function cancelarRenovacion() {
  try {
    await apiSuscripcion.cancelar();
    await cargarSuscripcion();
  } catch (e) {
    error.value = e.message;
  }
}

const iniciandoPago = ref(false);
async function iniciarSuscripcion() {
  iniciandoPago.value = true;
  try {
    const { urlPago } = await apiSuscripcion.crear({ modalidad: 'automatica' });
    window.location.href = urlPago;
  } catch (e) {
    error.value = e.message;
    iniciandoPago.value = false;
  }
}

async function cargarActividad() {
  try {
    historialActividad.value = await apiPerfil.actividad();
  } catch { /* silencioso */ }
}

onMounted(async () => {
  await cargar();
  await Promise.all([cargarSuscripcion(), cargarActividad()]);
});
</script>

<template>
  <section class="page-container">
    <div class="cabecera-seccion">
      <h2>Perfil profesional</h2>
    </div>

    <DirectAdSlot espacio-id="adsense-perfil" />

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="aviso" class="error">{{ aviso }}</p>
    <p v-if="guardado" class="exito" role="status">{{ guardado }}</p>

    <div class="grid-2" style="margin-bottom: 24px">
      <!-- Datos fiscales -->
      <div class="card">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="#6B7280" stroke-width="1.4"/><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
          Datos fiscales
        </div>
        <form class="card-body" style="display: flex; flex-direction: column; gap: 12px" @submit.prevent="guardar">
          <div>
            <label class="field-label">Nombre o razón social</label>
            <input v-model="formulario.nombre" placeholder="Tu nombre o empresa" required>
          </div>
          <div class="fila-doble">
            <div>
              <label class="field-label">NIT / Cédula</label>
              <input v-model="formulario.nit" placeholder="Número de documento" inputmode="numeric">
            </div>
            <div>
              <label class="field-label">Contacto</label>
              <input v-model="formulario.contacto" placeholder="Teléfono o correo">
            </div>
          </div>
          <div>
            <label class="field-label">Régimen tributario</label>
            <select v-model="formulario.regimen">
              <option value="" disabled>Elige tu régimen</option>
              <option v-for="r in REGIMENES" :key="r.valor" :value="r.valor">{{ r.etiqueta }}</option>
            </select>
          </div>
          <div>
            <label class="field-label">Logo (opcional, máx. 1 MB)</label>
            <input type="file" accept="image/*" @change="cambiarLogo" style="background: none; border: none; padding: 0">
          </div>
          <img v-if="formulario.logoBase64" :src="formulario.logoBase64" alt="Vista previa del logo" class="logo-previa">
          <button class="btn btn-primary" type="submit">Guardar perfil</button>
        </form>
      </div>

      <!-- Configuración y donaciones -->
      <div style="display: flex; flex-direction: column; gap: 16px">
        <!-- Privacidad -->
        <div class="card">
          <div class="card-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#6B7280" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="#6B7280" stroke-width="1.4"/></svg>
            Privacidad y publicidad
          </div>
          <div class="card-body">
            <p class="nota" style="margin: 0 0 12px">
              Cookies de publicidad (Google AdSense):
              <strong>{{ consentimiento === true ? 'aceptadas' : consentimiento === false ? 'rechazadas' : 'sin decidir' }}</strong>
            </p>
            <div class="acciones" style="margin: 0">
              <button v-if="consentimiento !== true" class="btn btn-secondary btn-sm" @click="cambiarPreferencia(true)">Aceptar</button>
              <button v-if="consentimiento !== false" class="btn btn-secondary btn-sm" @click="cambiarPreferencia(false)">Rechazar</button>
              <button v-if="consentimiento !== null" class="btn btn-secondary btn-sm" @click="restablecerPreferencia">Restablecer</button>
            </div>
          </div>
        </div>

        <!-- Donaciones -->
        <div class="card">
          <div class="card-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 018 4.5 3.5 3.5 0 0113.5 7C13.5 10.5 8 14 8 14z" fill="#E11D48"/></svg>
            Apoyar Quotizador
          </div>
          <div class="card-body">
            <DonationButton v-if="!mostrarDonacion" @abrir="mostrarDonacion = true" />
            <DonationForm v-else />
            <DonationHistory />
          </div>
        </div>
      </div>
    </div>

    <!-- Establecer contraseña para usuarios solo-social -->
    <div v-if="usuario && !proveedores.includes('email')" class="card" style="margin-bottom: 16px">
      <div class="card-header">🔑 Establecer contraseña</div>
      <div class="card-body">
        <p class="nota">Tu cuenta usa solo inicio de sesión social. Puedes establecer una contraseña para también iniciar sesión con correo.</p>
        <p v-if="passwordError" class="error" role="alert">{{ passwordError }}</p>
        <p v-if="passwordGuardado" class="exito" role="status">{{ passwordGuardado }}</p>
        <form style="display:flex; gap:8px; flex-wrap:wrap" @submit.prevent="establecerPassword">
          <input v-model="nuevaPasswordPerfil" type="password" placeholder="Nueva contraseña (mín. 8 caracteres)" minlength="8" required style="flex:1; min-width:200px">
          <button class="btn btn-primary" type="submit">Establecer contraseña</button>
        </form>
      </div>
    </div>

    <!-- Suscripción premium -->
    <div v-if="usuario && usuario.tipoCuenta === 'premium' && estadoSuscripcion" class="card" style="margin-bottom: 16px">
      <div class="card-header">⭐ Mi suscripción premium</div>
      <div class="card-body">
        <p><strong>Estado:</strong> {{ estadoSuscripcion.estado }}</p>
        <p v-if="estadoSuscripcion.fecha_vencimiento"><strong>Vence:</strong> {{ new Date(estadoSuscripcion.fecha_vencimiento).toLocaleDateString('es-CO') }}</p>
        <p v-if="estadoSuscripcion.modalidad"><strong>Renovación:</strong> {{ estadoSuscripcion.modalidad === 'automatica' ? 'Automática' : 'Manual' }}</p>
        <div v-if="['vencida', 'gracia'].includes(estadoSuscripcion.estado)" class="error" style="margin: 8px 0" role="alert">
          Tu suscripción está vencida. Renueva para recuperar acceso completo.
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
          <button
            v-if="['vencida', 'gracia', 'retencion'].includes(estadoSuscripcion.estado)"
            class="btn btn-primary btn-sm"
            :disabled="iniciandoPago"
            @click="iniciarSuscripcion"
          >{{ iniciandoPago ? 'Redirigiendo…' : 'Renovar suscripción' }}</button>
          <button
            v-if="estadoSuscripcion.estado === 'activa' && estadoSuscripcion.modalidad === 'automatica'"
            class="btn btn-secondary btn-sm"
            @click="cancelarRenovacion"
          >Cancelar renovación automática</button>
        </div>
      </div>
    </div>

    <!-- CTA para usuarios sin suscripción premium -->
    <div v-else-if="usuario && usuario.tipoCuenta !== 'premium'" class="card" style="margin-bottom: 16px; border: 2px solid var(--color-primario, #2563eb)">
      <div class="card-header" style="color: var(--color-primario, #2563eb)">⭐ Pásate a Premium</div>
      <div class="card-body">
        <p>Obtén cotizaciones ilimitadas, clientes ilimitados, grupos y más por <strong>$20 USD al año</strong>.</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
          <button class="btn btn-primary" :disabled="iniciandoPago" @click="iniciarSuscripcion">
            {{ iniciandoPago ? 'Redirigiendo…' : 'Suscribirse por $20 USD/año' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Historial de actividad reciente -->
    <div v-if="historialActividad.length > 0" class="card" style="margin-bottom: 16px">
      <div class="card-header">Actividad reciente</div>
      <div class="card-body">
        <ul style="margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:6px">
          <li
            v-for="item in historialActividad"
            :key="item.id"
            style="display:flex; justify-content:space-between; align-items:baseline; gap:8px"
          >
            <span>{{ item.detalle || item.tipo }}</span>
            <span class="nota" style="white-space:nowrap; font-size:0.78rem">
              {{ new Date(item.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
