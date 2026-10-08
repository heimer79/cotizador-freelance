<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../api.js';

const usuarios = ref([]);
const total = ref(0);
const pagina = ref(1);
const busqueda = ref('');
const error = ref('');
const cargando = ref(true);

async function cargar() {
  cargando.value = true;
  try {
    const r = await admin.usuarios(pagina.value, busqueda.value);
    usuarios.value = r.usuarios;
    total.value = r.total;
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

async function suspender(id) {
  await admin.suspenderUsuario(id);
  await cargar();
}

async function reactivar(id) {
  await admin.reactivarUsuario(id);
  await cargar();
}

async function cambiarRol(id, rolActual) {
  const nuevoRol = rolActual === 'admin' ? 'normal' : 'admin';
  try {
    await admin.cambiarRol(id, nuevoRol);
    await cargar();
  } catch (e) { error.value = e.message; }
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Gestión de Usuarios</div>
    <div class="card-body">
      <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap">
        <input v-model="busqueda" placeholder="Buscar por nombre o correo…" style="flex:1; min-width:200px" aria-label="Buscar usuarios por nombre o correo" @keyup.enter="pagina = 1; cargar()">
        <button class="btn btn-secondary" @click="pagina = 1; cargar()">Buscar</button>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="cargando" class="nota">Cargando…</p>
      <div v-else style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid var(--color-borde)">
              <th style="text-align:left; padding:6px 8px">Nombre</th>
              <th style="text-align:left; padding:6px 8px">Correo</th>
              <th style="text-align:left; padding:6px 8px">Cuenta</th>
              <th style="text-align:left; padding:6px 8px">Rol</th>
              <th style="text-align:left; padding:6px 8px">Estado</th>
              <th style="text-align:left; padding:6px 8px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id" style="border-bottom:1px solid var(--color-borde)">
              <td style="padding:6px 8px">{{ u.nombre_completo }}</td>
              <td style="padding:6px 8px">{{ u.email }}</td>
              <td style="padding:6px 8px">{{ u.tipo_cuenta }}</td>
              <td style="padding:6px 8px">{{ u.rol }}</td>
              <td style="padding:6px 8px">{{ u.estado }}</td>
              <td style="padding:6px 8px; display:flex; gap:4px; flex-wrap:wrap">
                <button v-if="u.estado === 'activo'" class="btn btn-secondary btn-sm" @click="suspender(u.id)">Suspender</button>
                <button v-else class="btn btn-secondary btn-sm" @click="reactivar(u.id)">Reactivar</button>
                <button class="btn btn-secondary btn-sm" @click="cambiarRol(u.id, u.rol)">
                  {{ u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="nota" style="margin-top:8px">Total: {{ total }} usuario(s)</p>
        <div style="display:flex; gap:8px; margin-top:8px" v-if="total > 20">
          <button class="btn btn-secondary btn-sm" :disabled="pagina === 1" @click="pagina--; cargar()">Anterior</button>
          <button class="btn btn-secondary btn-sm" :disabled="pagina * 20 >= total" @click="pagina++; cargar()">Siguiente</button>
        </div>
      </div>
    </div>
  </div>
</template>
