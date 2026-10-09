<script setup>
import { ref, computed } from 'vue';
import { auth } from '../api.js';

const props = defineProps({
  tokenRestablecer: { type: String, default: null }
});
const emit = defineEmits(['autenticado', 'cerrar']);

const modo = ref(props.tokenRestablecer ? 'restablecer' : 'login');
const error = ref('');
const aviso = ref('');
const enviando = ref(false);

const datos = ref({ nombreCompleto: '', email: '', tipoDocumento: 'CC', numeroDocumento: '', password: '', aceptaTerminos: false });
const nuevaPassword = ref('');
const mostrarPassword = ref(false);

// T059: 2FA verification step
const requiere2fa = ref(false);
const codigo2fa = ref('');

const titulos = {
  login: 'Inicia sesión para continuar',
  registro: 'Crea tu cuenta gratis',
  olvide: 'Recuperar contraseña',
  restablecer: 'Nueva contraseña'
};
const titulo = computed(() => requiere2fa.value ? 'Verificación 2FA' : titulos[modo.value]);

function cambiarModo(nuevo) {
  error.value = '';
  aviso.value = '';
  modo.value = nuevo;
}

async function enviar() {
  error.value = '';
  aviso.value = '';
  enviando.value = true;
  try {
    if (modo.value === 'login') {
      try {
        const r = await auth.login({ email: datos.value.email, password: datos.value.password, codigo2fa: codigo2fa.value || undefined });
        emit('autenticado', r.usuario);
      } catch (e) {
        if (e.requiere2fa || (e.response?.data?.requiere2fa)) {
          requiere2fa.value = true;
          error.value = '';
          enviando.value = false;
          return;
        }
        throw e;
      }
    } else if (modo.value === 'registro') {
      if (!datos.value.aceptaTerminos) {
        error.value = 'Debes aceptar la Política de Privacidad y los Términos de Uso para registrarte.';
        enviando.value = false;
        return;
      }
      const r = await auth.registro(datos.value);
      emit('autenticado', r?.usuario);
    } else if (modo.value === 'olvide') {
      await auth.olvide(datos.value.email);
      aviso.value = 'Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.';
    } else if (modo.value === 'restablecer') {
      await auth.restablecer(props.tokenRestablecer, nuevaPassword.value);
      aviso.value = 'Tu contraseña se cambió. Ya puedes iniciar sesión.';
      modo.value = 'login';
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    enviando.value = false;
  }
}

function cerrarOverlay(e) {
  if (e.target === e.currentTarget) emit('cerrar');
}
</script>

<template>
  <div class="modal-overlay" @click="cerrarOverlay">
    <div class="modal-card">
      <div style="display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 24px">
        <div class="navbar-logo-icon" style="width: 32px; height: 32px; font-size: 18px">Q</div>
        <span class="navbar-logo-text" style="font-size: 18px">Quoti<span>zador</span></span>
      </div>

      <h2 style="margin: 0; font-size: 20px; font-weight: 800; text-align: center; letter-spacing: -0.02em">{{ titulo }}</h2>

      <p v-if="modo === 'login' || modo === 'registro'" style="margin: 8px 0 0; font-size: 14px; color: var(--color-texto-secundario); text-align: center; line-height: 1.5">
        Tu cotización se guardará automáticamente después de iniciar sesión.
      </p>

      <div v-if="modo === 'login'" class="modal-info-badge" style="margin: 20px 0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0"><circle cx="8" cy="8" r="6.5" stroke="var(--color-primario)" stroke-width="1.5"/><path d="M8 7v4M8 5v.5" stroke="var(--color-primario)" stroke-width="1.5" stroke-linecap="round"/></svg>
        No perderás los datos que ya ingresaste
      </div>

      <p v-if="error" class="error" role="alert" style="text-align: center; margin: 12px 0">{{ error }}</p>
      <p v-if="aviso" class="exito" style="text-align: center; margin: 12px 0">{{ aviso }}</p>

      <!-- T059: 2FA step -->
      <template v-if="requiere2fa">
        <p style="font-size: 14px; margin: 12px 0; color: var(--color-texto-secundario); text-align: center">
          Tu cuenta tiene verificación en dos pasos. Ingresa el código de tu app autenticadora.
        </p>
        <form class="formulario" @submit.prevent="enviar" style="margin: 12px 0">
          <input v-model="codigo2fa" type="text" inputmode="numeric" maxlength="6" placeholder="Código de 6 dígitos" autocomplete="one-time-code" style="letter-spacing: 0.3em; text-align: center; font-size: 1.1rem" required>
          <button class="btn btn-primary" type="submit" :disabled="enviando" style="width: 100%">{{ enviando ? 'Verificando…' : 'Verificar' }}</button>
        </form>
        <p style="font-size: 12px; text-align: center; margin: 0">
          <a href="#" style="color: var(--color-texto-secundario)" @click.prevent="requiere2fa = false; codigo2fa = ''">Volver</a>
        </p>
      </template>

      <!-- Login -->
      <form v-else-if="modo === 'login'" class="formulario" @submit.prevent="enviar" style="margin-bottom: 16px">
        <div>
          <label class="field-label">Correo electrónico</label>
          <input v-model="datos.email" type="email" placeholder="tu@correo.com" autocomplete="email" required>
        </div>
        <div style="position: relative">
          <label class="field-label">Contraseña</label>
          <input
            v-model="datos.password"
            :type="mostrarPassword ? 'text' : 'password'"
            placeholder="Tu contraseña"
            autocomplete="current-password"
            required
            style="padding-right: 40px; width: 100%"
          >
          <button
            type="button"
            @click="mostrarPassword = !mostrarPassword"
            aria-label="Mostrar u ocultar contraseña"
            style="position:absolute; right:10px; top:50%; transform:translateY(50%); background:none; border:none; cursor:pointer; font-size:16px; padding:0"
          >{{ mostrarPassword ? '🙈' : '👁' }}</button>
        </div>
        <button class="btn btn-primary" type="submit" :disabled="enviando" style="width: 100%">Iniciar sesión</button>
      </form>
      <div v-if="modo === 'login' || modo === 'registro'" style="margin: 12px 0; text-align: center">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px">
          <hr style="flex:1; border:none; border-top:1px solid var(--color-borde)">
          <span style="font-size:12px; color:var(--color-texto-secundario)">o continúa con</span>
          <hr style="flex:1; border:none; border-top:1px solid var(--color-borde)">
        </div>
        <div style="display:flex; gap:8px; justify-content:center">
          <a href="/api/auth/google" class="btn btn-secondary" style="flex:1; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px">
            <span>G</span> Google
          </a>
          <a href="/api/auth/facebook" class="btn btn-secondary" style="flex:1; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px">
            <span>f</span> Facebook
          </a>
        </div>
      </div>

      <!-- Registro -->
      <form v-if="modo === 'registro'" class="formulario" @submit.prevent="enviar" style="margin: 16px 0">
        <input v-model="datos.nombreCompleto" placeholder="Nombre completo" autocomplete="name" required>
        <input v-model="datos.email" type="email" placeholder="Correo electrónico" autocomplete="email" required>
        <div class="fila-doble">
          <div>
            <label class="field-label">Tipo doc.</label>
            <select v-model="datos.tipoDocumento">
              <option value="CC">CC</option>
              <option value="NIT">NIT</option>
              <option value="CE">CE</option>
              <option value="pasaporte">Pasaporte</option>
            </select>
          </div>
          <div>
            <label class="field-label">Número</label>
            <input v-model="datos.numeroDocumento" placeholder="Documento" inputmode="numeric" required>
          </div>
        </div>
        <input v-model="datos.password" type="password" placeholder="Contraseña (mín. 8 caracteres)" autocomplete="new-password" minlength="8" required>
        <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; cursor:pointer">
          <input type="checkbox" v-model="datos.aceptaTerminos" style="margin-top:2px; flex-shrink:0" required>
          <span>
            He leído y acepto los
            <a href="/legal/unificado" target="_blank" style="color:var(--color-primario)">Términos de Uso y Política de Privacidad</a>
          </span>
        </label>
        <button class="btn btn-primary" type="submit" :disabled="enviando" style="width: 100%">Crear cuenta</button>
      </form>

      <!-- Olvidé contraseña -->
      <form v-else-if="modo === 'olvide'" class="formulario" @submit.prevent="enviar" style="margin: 16px 0">
        <input v-model="datos.email" type="email" placeholder="Correo electrónico" autocomplete="email" required>
        <button class="btn btn-primary" type="submit" :disabled="enviando" style="width: 100%">Enviar enlace</button>
      </form>

      <!-- Restablecer -->
      <form v-else-if="modo === 'restablecer'" class="formulario" @submit.prevent="enviar" style="margin: 16px 0">
        <input v-model="nuevaPassword" type="password" placeholder="Nueva contraseña (mín. 8 caracteres)" autocomplete="new-password" minlength="8" required>
        <button class="btn btn-primary" type="submit" :disabled="enviando" style="width: 100%">Guardar contraseña</button>
      </form>

      <!-- Footer links -->
      <div v-if="modo === 'login'" style="text-align: center">
        <p style="margin: 0 0 8px; font-size: 13px; color: var(--color-texto-secundario)">
          ¿No tienes cuenta? <a href="#" style="color: var(--color-primario); font-weight: 600; text-decoration: none" @click.prevent="cambiarModo('registro')">Regístrate gratis</a>
        </p>
        <p style="margin: 0; font-size: 12px">
          <a href="#" style="color: var(--color-texto-secundario); text-decoration: none" @click.prevent="cambiarModo('olvide')">¿Olvidaste tu contraseña?</a>
        </p>
      </div>

      <p v-else-if="modo === 'registro'" style="margin: 0; font-size: 13px; color: var(--color-texto-secundario); text-align: center">
        ¿Ya tienes cuenta? <a href="#" style="color: var(--color-primario); font-weight: 600; text-decoration: none" @click.prevent="cambiarModo('login')">Inicia sesión</a>
      </p>

      <p v-else-if="modo === 'olvide'" style="margin: 0; font-size: 13px; text-align: center">
        <a href="#" style="color: var(--color-texto-secundario); text-decoration: none" @click.prevent="cambiarModo('login')">Volver a iniciar sesión</a>
      </p>
    </div>
  </div>
</template>
