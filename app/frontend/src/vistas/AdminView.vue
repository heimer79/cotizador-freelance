<script setup>
import { ref } from 'vue';
import AdminConfigAdsense from '../components/admin/AdminConfigAdsense.vue';
import AdminConfigPasarelas from '../components/admin/AdminConfigPasarelas.vue';
import AdminConfigAuth from '../components/admin/AdminConfigAuth.vue';
import AdminConfigCorreo from '../components/admin/AdminConfigCorreo.vue';
import AdminNotificaciones from '../components/admin/AdminNotificaciones.vue';
import AdminUsuarios from '../components/admin/AdminUsuarios.vue';
import AdminVisorBD from '../components/admin/AdminVisorBD.vue';
import { useAuth } from '../composables/useAuth.js';

const { isAdmin } = useAuth();
const seccionActiva = ref('notificaciones');

const secciones = [
  { id: 'notificaciones', etiqueta: 'Notificaciones' },
  { id: 'usuarios', etiqueta: 'Usuarios' },
  { id: 'adsense', etiqueta: 'AdSense' },
  { id: 'pasarelas', etiqueta: 'Pasarelas' },
  { id: 'auth_social', etiqueta: 'Auth Social' },
  { id: 'correo', etiqueta: 'Correo' },
  { id: 'bd', etiqueta: 'Visor BD' }
];
</script>

<template>
  <section class="page-container">
    <h2>Panel de administración</h2>
    <p v-if="!isAdmin" class="error" role="alert">Acceso restringido a administradores.</p>
    <template v-else>
      <nav role="tablist" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:24px" aria-label="Secciones de administración">
        <button
          v-for="s in secciones"
          :key="s.id"
          role="tab"
          class="btn"
          :class="seccionActiva === s.id ? 'btn-primary' : 'btn-secondary'"
          :aria-selected="seccionActiva === s.id"
          :aria-current="seccionActiva === s.id ? 'page' : undefined"
          @click="seccionActiva = s.id"
        >{{ s.etiqueta }}</button>
      </nav>
      <AdminNotificaciones v-if="seccionActiva === 'notificaciones'" />
      <AdminUsuarios v-else-if="seccionActiva === 'usuarios'" />
      <AdminConfigAdsense v-else-if="seccionActiva === 'adsense'" />
      <AdminConfigPasarelas v-else-if="seccionActiva === 'pasarelas'" />
      <AdminConfigAuth v-else-if="seccionActiva === 'auth_social'" />
      <AdminConfigCorreo v-else-if="seccionActiva === 'correo'" />
      <AdminVisorBD v-else-if="seccionActiva === 'bd'" />
    </template>
  </section>
</template>
