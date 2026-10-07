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

const datos = ref({ nombreCompleto: '', email: '', tipoDocumento: 'CC', numeroDocumento: '', password: '' });
const nuevaPassword = ref('');

const titulos = {
  login: 'Inicia sesión para continuar',
  registro: 'Crea tu cuenta gratis',
  olvide: 'Recuperar contraseña',
  restablecer: 'Nueva contraseña'
};
const titulo = computed(() => titulos[modo.value]);

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
      const r = await auth.login({ email: datos.value.email, password: datos.value.password });
      emit('autenticado', r.usuario);
    } else if (modo.value === 'registro') {
      const r = await auth.registro(datos.value);
      emit('autenticado', r.usuario);
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

      <!-- Login -->
      <form v-if="modo === 'login'" class="formulario" @submit.prevent="enviar" style="margin-bottom: 16px">
        <div>
          <label class="field-label">Correo electrónico</label>
          <input v-model="datos.email" type="email" placeholder="tu@correo.com" autocomplete="email" required>
        </div>
        <div>
          <label class="field-label">Contraseña</label>
          <input v-model="datos.password" type="password" placeholder="Tu contraseña" autocomplete="current-password" required>
        </div>
        <button class="btn btn-primary" type="submit" :disabled="enviando" style="width: 100%">Iniciar sesión</button>
      </form>

      <!-- Registro -->
      <form v-else-if="modo === 'registro'" class="formulario" @submit.prevent="enviar" style="margin: 16px 0">
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
