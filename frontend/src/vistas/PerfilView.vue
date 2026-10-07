<script setup>
import { ref, onMounted } from 'vue';
import { perfil as apiPerfil } from '../api.js';
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

const formulario = ref({ nombre: '', nit: '', contacto: '', logoBase64: '', regimen: '' });
const error = ref('');
const aviso = ref('');
const guardado = ref('');
const mostrarDonacion = ref(false);

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

onMounted(cargar);
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
  </section>
</template>
