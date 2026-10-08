<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../api.js';

const notificaciones = ref([]);
const total = ref(0);
const pagina = ref(1);
const error = ref('');
const cargando = ref(true);

async function cargar() {
  cargando.value = true;
  try {
    const r = await admin.notificaciones(pagina.value);
    notificaciones.value = r.notificaciones;
    total.value = r.total;
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

async function marcarLeida(id) {
  await admin.marcarNotificacion(id);
  notificaciones.value = notificaciones.value.map((n) => n.id === id ? { ...n, leida: 1 } : n);
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Notificaciones del sistema</div>
    <div class="card-body">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="cargando" class="nota">Cargando…</p>
      <div v-else>
        <p v-if="notificaciones.length === 0" class="nota">No hay notificaciones.</p>
        <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px">
          <li
            v-for="n in notificaciones"
            :key="n.id"
            :style="n.leida ? 'opacity:0.6' : ''"
            style="padding:12px; border:1px solid var(--color-borde); border-radius:6px"
          >
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px">
              <div>
                <strong>{{ n.titulo }}</strong>
                <span class="nota" style="font-size:11px; margin-left:8px">{{ n.tipo }}</span>
                <p style="margin:4px 0 0; font-size:13px">{{ n.descripcion }}</p>
                <p class="nota" style="margin:4px 0 0; font-size:12px">{{ new Date(n.fecha).toLocaleString('es-CO') }}</p>
              </div>
              <button v-if="!n.leida" class="btn btn-secondary btn-sm" @click="marcarLeida(n.id)">Marcar leída</button>
            </div>
          </li>
        </ul>
        <p class="nota" style="margin-top:8px">Total: {{ total }}</p>
      </div>
    </div>
  </div>
</template>
