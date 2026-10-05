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

// Cambiar la preferencia de cookies recarga la página para que AdSense se cargue o deje de cargarse (contrato de consentimiento).
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
  <section>
    <h2>Perfil profesional</h2>
    <DirectAdSlot espacio-id="adsense-perfil" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="aviso" class="error">{{ aviso }}</p>
    <p v-if="guardado" class="exito" role="status">{{ guardado }}</p>

    <form class="formulario" @submit.prevent="guardar">
      <input v-model="formulario.nombre" placeholder="Nombre o razón social" required />
      <input v-model="formulario.nit" placeholder="NIT o número de cédula" inputmode="numeric" />
      <input v-model="formulario.contacto" placeholder="Contacto (teléfono o correo)" />
      <label>
        Régimen tributario
        <select v-model="formulario.regimen">
          <option value="" disabled>Elige tu régimen</option>
          <option v-for="r in REGIMENES" :key="r.valor" :value="r.valor">{{ r.etiqueta }}</option>
        </select>
      </label>
      <label>
        Logo (opcional, máx. 1 MB)
        <input type="file" accept="image/*" @change="cambiarLogo" />
      </label>
      <img v-if="formulario.logoBase64" :src="formulario.logoBase64" alt="Vista previa del logo" class="logo-previa" />
      <button type="submit">Guardar perfil</button>
    </form>

    <section class="bloque">
      <h3>Privacidad y publicidad</h3>
      <p class="nota">
        Cookies de publicidad (Google AdSense): {{ consentimiento === true ? 'aceptadas' : consentimiento === false ? 'rechazadas' : 'sin decidir' }}.
      </p>
      <div class="acciones">
        <button v-if="consentimiento !== true" class="secundario" @click="cambiarPreferencia(true)">Aceptar cookies de publicidad</button>
        <button v-if="consentimiento !== false" class="secundario" @click="cambiarPreferencia(false)">Rechazar cookies de publicidad</button>
        <button v-if="consentimiento !== null" class="secundario" @click="restablecerPreferencia">Volver a preguntar</button>
      </div>
    </section>

    <section class="bloque">
      <DonationButton v-if="!mostrarDonacion" @abrir="mostrarDonacion = true" />
      <DonationForm v-else />
      <DonationHistory />
    </section>
  </section>
</template>
