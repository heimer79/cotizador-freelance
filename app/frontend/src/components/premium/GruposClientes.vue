<script setup>
import { ref, onMounted } from 'vue';
import { grupos as apiGrupos } from '../../api.js';

const lista = ref([]);
const grupoSeleccionado = ref(null);
const miembros = ref([]);
const error = ref('');
const nombreNuevo = ref('');
const descripcionNueva = ref('');
const creando = ref(false);

async function cargar() {
  try {
    lista.value = await apiGrupos.listar();
  } catch (e) {
    error.value = e.message;
  }
}

async function crearGrupo() {
  if (!nombreNuevo.value.trim()) return;
  try {
    const g = await apiGrupos.crear({ nombre: nombreNuevo.value, descripcion: descripcionNueva.value });
    lista.value.push(g);
    nombreNuevo.value = '';
    descripcionNueva.value = '';
    creando.value = false;
  } catch (e) {
    error.value = e.message;
  }
}

async function eliminarGrupo(id) {
  try {
    await apiGrupos.eliminar(id);
    lista.value = lista.value.filter((g) => g.id !== id);
    if (grupoSeleccionado.value?.id === id) {
      grupoSeleccionado.value = null;
      miembros.value = [];
    }
  } catch (e) {
    error.value = e.message;
  }
}

async function verMiembros(grupo) {
  grupoSeleccionado.value = grupo;
  try {
    miembros.value = await apiGrupos.miembros(grupo.id);
  } catch (e) {
    error.value = e.message;
  }
}

async function quitarMiembro(clienteId) {
  try {
    await apiGrupos.quitarMiembro(grupoSeleccionado.value.id, clienteId);
    miembros.value = miembros.value.filter((c) => c.id !== clienteId);
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(cargar);
</script>

<template>
  <div>
    <div class="cabecera-seccion">
      <h3>Grupos de clientes</h3>
      <button class="btn btn-primary btn-sm" @click="creando = !creando">Nuevo grupo</button>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <form v-if="creando" class="card card-body" style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px" @submit.prevent="crearGrupo">
      <input v-model="nombreNuevo" placeholder="Nombre del grupo" required>
      <input v-model="descripcionNueva" placeholder="Descripción (opcional)">
      <div style="display:flex; gap:8px">
        <button class="btn btn-primary btn-sm" type="submit">Crear</button>
        <button class="btn btn-secondary btn-sm" type="button" @click="creando = false">Cancelar</button>
      </div>
    </form>

    <div v-if="lista.length === 0" class="nota">Aún no tienes grupos. Crea uno para organizar tus clientes.</div>

    <div class="grid-2" style="gap:12px">
      <div
        v-for="grupo in lista"
        :key="grupo.id"
        class="card"
        :class="{ 'card-seleccionada': grupoSeleccionado?.id === grupo.id }"
        style="cursor:pointer"
        @click="verMiembros(grupo)"
      >
        <div class="card-body" style="display:flex; justify-content:space-between; align-items:center">
          <div>
            <strong>{{ grupo.nombre }}</strong>
            <p v-if="grupo.descripcion" class="nota" style="margin:2px 0 0">{{ grupo.descripcion }}</p>
          </div>
          <button class="btn btn-secondary btn-sm" @click.stop="eliminarGrupo(grupo.id)" aria-label="Eliminar grupo">✕</button>
        </div>
      </div>
    </div>

    <div v-if="grupoSeleccionado" class="card" style="margin-top:16px">
      <div class="card-header">Clientes en «{{ grupoSeleccionado.nombre }}»</div>
      <div class="card-body">
        <div v-if="miembros.length === 0" class="nota">Sin clientes en este grupo.</div>
        <ul v-else style="margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:6px">
          <li
            v-for="c in miembros"
            :key="c.id"
            style="display:flex; justify-content:space-between; align-items:center"
          >
            <span>{{ c.nombre }}</span>
            <button class="btn btn-secondary btn-sm" @click="quitarMiembro(c.id)" aria-label="Quitar del grupo">Quitar</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
