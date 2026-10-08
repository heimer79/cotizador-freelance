import { ref, computed } from 'vue';
import { auth } from '../api.js';

const usuario = ref(null);
const error = ref('');

const isAdmin = computed(() => usuario.value?.rol === 'admin');
const isPremium = computed(() => usuario.value?.tipoCuenta === 'premium');
const proveedores = computed(() => usuario.value?.proveedores || []);

async function cargar() {
  try {
    const r = await auth.yo();
    usuario.value = r.usuario;
  } catch {
    usuario.value = null;
  }
}

async function login({ email, password }) {
  error.value = '';
  const r = await auth.login({ email, password });
  usuario.value = r.usuario;
  return r;
}

async function logout() {
  await auth.logout();
  usuario.value = null;
}

function loginGoogle() {
  window.location.href = '/api/auth/google';
}

function loginFacebook() {
  window.location.href = '/api/auth/facebook';
}

function setUsuario(u) {
  usuario.value = u;
}

export function useAuth() {
  return {
    usuario,
    isAdmin,
    isPremium,
    proveedores,
    error,
    cargar,
    login,
    logout,
    loginGoogle,
    loginFacebook,
    setUsuario
  };
}
