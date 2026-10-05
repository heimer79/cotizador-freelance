<script setup>
import { ref, computed } from 'vue';
import { auth } from '../api.js';

const props = defineProps({
  tokenRestablecer: { type: String, default: null }
});
const emit = defineEmits(['autenticado']);

const modo = ref(props.tokenRestablecer ? 'restablecer' : 'login');
const error = ref('');
const aviso = ref('');
const enviando = ref(false);

const datos = ref({ nombreCompleto: '', email: '', tipoDocumento: 'CC', numeroDocumento: '', password: '' });
const nuevaPassword = ref('');

const titulos = {
  login: 'Iniciar sesión',
  registro: 'Crear cuenta',
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
</script>

<template>
  <section class="acceso">
    <h2>{{ titulo }}</h2>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="aviso" class="exito">{{ aviso }}</p>

    <form v-if="modo === 'login'" @submit.prevent="enviar" class="formulario">
      <input v-model="datos.email" type="email" placeholder="Correo electrónico" autocomplete="email" required />
      <input v-model="datos.password" type="password" placeholder="Contraseña" autocomplete="current-password" required />
      <button type="submit" :disabled="enviando">Entrar</button>
      <button type="button" class="secundario" @click="cambiarModo('olvide')">Olvidé mi contraseña</button>
      <button type="button" class="secundario" @click="cambiarModo('registro')">Crear una cuenta nueva</button>
    </form>

    <form v-else-if="modo === 'registro'" @submit.prevent="enviar" class="formulario">
      <input v-model="datos.nombreCompleto" placeholder="Nombre completo" autocomplete="name" required />
      <input v-model="datos.email" type="email" placeholder="Correo electrónico" autocomplete="email" required />
      <label>
        Tipo de documento
        <select v-model="datos.tipoDocumento">
          <option value="CC">Cédula de ciudadanía (CC)</option>
          <option value="NIT">NIT</option>
          <option value="CE">Cédula de extranjería (CE)</option>
          <option value="pasaporte">Pasaporte</option>
        </select>
      </label>
      <input v-model="datos.numeroDocumento" placeholder="Número de documento" inputmode="numeric" required />
      <input v-model="datos.password" type="password" placeholder="Contraseña (mínimo 8 caracteres)" autocomplete="new-password" minlength="8" required />
      <button type="submit" :disabled="enviando">Crear cuenta</button>
      <button type="button" class="secundario" @click="cambiarModo('login')">Ya tengo cuenta</button>
    </form>

    <form v-else-if="modo === 'olvide'" @submit.prevent="enviar" class="formulario">
      <input v-model="datos.email" type="email" placeholder="Correo electrónico" autocomplete="email" required />
      <button type="submit" :disabled="enviando">Enviar enlace</button>
      <button type="button" class="secundario" @click="cambiarModo('login')">Volver</button>
    </form>

    <form v-else-if="modo === 'restablecer'" @submit.prevent="enviar" class="formulario">
      <input v-model="nuevaPassword" type="password" placeholder="Nueva contraseña (mínimo 8 caracteres)" autocomplete="new-password" minlength="8" required />
      <button type="submit" :disabled="enviando">Guardar contraseña</button>
    </form>
  </section>
</template>
