<template>
  <div class="c2fa-container">
    <h3 class="c2fa-title">Autenticación de dos factores (2FA)</h3>

    <!-- Estado: inactivo -->
    <template v-if="!activo">
      <p class="nota">Añade una capa extra de seguridad. Necesitarás una app como Google Authenticator o Authy.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <template v-if="!qrUrl">
        <button class="btn btn-primary btn-sm" :disabled="cargando" @click="iniciar">
          {{ cargando ? 'Generando…' : 'Activar 2FA' }}
        </button>
      </template>

      <template v-else>
        <p class="c2fa-instruction">Escanea el código QR con tu app autenticadora:</p>
        <img :src="qrUrl" alt="QR 2FA" class="c2fa-qr">
        <p class="nota" style="word-break: break-all">Clave manual: <code>{{ secreto }}</code></p>
        <p class="c2fa-instruction">Luego ingresa el código de 6 dígitos para confirmar:</p>
        <div style="display:flex; gap: 8px; flex-wrap: wrap; margin-top: 8px">
          <input v-model="codigoVerif" type="text" inputmode="numeric" maxlength="6" placeholder="000000" class="c2fa-input">
          <button class="btn btn-primary btn-sm" :disabled="verificando" @click="confirmar">
            {{ verificando ? 'Verificando…' : 'Confirmar' }}
          </button>
        </div>
      </template>
    </template>

    <!-- Estado: activo -->
    <template v-else>
      <div class="c2fa-activo">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 8l2.5 2.5L11 5.5" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="6.5" stroke="#16a34a" stroke-width="1.5"/></svg>
        <span>2FA activo</span>
      </div>
      <p class="nota">Tu cuenta está protegida con autenticación de dos factores.</p>

      <div v-if="codigos.length" style="margin: 12px 0; padding: 12px; background: #fefce8; border: 1px solid #fbbf24; border-radius: 8px">
        <strong style="font-size: 0.875rem">Guarda estos códigos de recuperación en un lugar seguro:</strong>
        <ul style="font-family: monospace; font-size: 0.85rem; margin: 8px 0 0; padding-left: 1.25rem">
          <li v-for="c in codigos" :key="c">{{ c }}</li>
        </ul>
        <button class="btn btn-secondary btn-sm" style="margin-top: 8px" @click="codigos = []">Entendido, los guardé</button>
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="btn btn-danger btn-sm" style="margin-top: 8px" :disabled="desactivando" @click="desactivar">
        {{ desactivando ? 'Desactivando…' : 'Desactivar 2FA' }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { auth as apiAuth } from '../api.js';

const props = defineProps({ totpActivo: { type: Boolean, default: false } });
const emit = defineEmits(['change']);

const activo = ref(props.totpActivo);
watch(() => props.totpActivo, (v) => { activo.value = v; });
const qrUrl = ref('');
const secreto = ref('');
const codigoVerif = ref('');
const codigos = ref([]);
const cargando = ref(false);
const verificando = ref(false);
const desactivando = ref(false);
const error = ref('');

async function iniciar() {
  cargando.value = true; error.value = '';
  try {
    const res = await apiAuth.activar2fa();
    qrUrl.value = res.qr;
    secreto.value = res.secret;
  } catch (e) {
    error.value = e.message;
  } finally { cargando.value = false; }
}

async function confirmar() {
  verificando.value = true; error.value = '';
  try {
    const res = await apiAuth.verificar2fa(codigoVerif.value);
    codigos.value = res.codigos || [];
    activo.value = true;
    qrUrl.value = ''; secreto.value = ''; codigoVerif.value = '';
    emit('change', true);
  } catch (e) {
    error.value = e.message;
  } finally { verificando.value = false; }
}

async function desactivar() {
  if (!confirm('¿Seguro que quieres desactivar el 2FA?')) return;
  desactivando.value = true; error.value = '';
  try {
    await apiAuth.desactivar2fa();
    activo.value = false;
    emit('change', false);
  } catch (e) {
    error.value = e.message;
  } finally { desactivando.value = false; }
}
</script>

<style scoped>
.c2fa-container { display: flex; flex-direction: column; gap: 0.5rem; }
.c2fa-title { font-size: 1rem; font-weight: 700; margin: 0; }
.c2fa-activo { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #16a34a; }
.c2fa-qr { width: 180px; height: 180px; border: 1px solid #e5e7eb; border-radius: 8px; }
.c2fa-instruction { font-size: 0.875rem; margin: 0; }
.c2fa-input { width: 120px; padding: 0.4rem 0.6rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; letter-spacing: 0.2em; text-align: center; }
</style>
