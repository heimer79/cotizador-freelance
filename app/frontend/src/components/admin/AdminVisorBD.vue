<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../api.js';

const TABLAS = ['usuarios', 'suscripciones', 'configuracion_plataforma', 'documentos_legales',
  'aceptaciones_legales', 'notificaciones_admin', 'donacion', 'auth_proveedores', 'historial_actividad'];

const tablaSeleccionada = ref('usuarios');
const filas = ref([]);
const columnas = ref([]);
const total = ref(0);
const pagina = ref(1);
const error = ref('');
const cargando = ref(false);

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const r = await admin.tabla(tablaSeleccionada.value, pagina.value);
    filas.value = r.filas;
    total.value = r.total;
    columnas.value = r.filas.length > 0 ? Object.keys(r.filas[0]) : [];
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

function cambiarTabla() {
  pagina.value = 1;
  cargar();
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Visor de base de datos (solo lectura)</div>
    <div class="card-body">
      <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center">
        <select v-model="tablaSeleccionada" @change="cambiarTabla" aria-label="Seleccionar tabla">
          <option v-for="t in TABLAS" :key="t" :value="t">{{ t }}</option>
        </select>
        <button class="btn btn-secondary btn-sm" @click="cargar">Recargar</button>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="cargando" class="nota">Cargando…</p>
      <div v-else style="overflow-x:auto">
        <table v-if="filas.length > 0" style="width:100%; border-collapse:collapse; font-size:12px">
          <thead>
            <tr style="border-bottom:2px solid var(--color-borde)">
              <th v-for="col in columnas" :key="col" style="text-align:left; padding:4px 6px; white-space:nowrap">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fila, i) in filas" :key="i" style="border-bottom:1px solid var(--color-borde)">
              <td v-for="col in columnas" :key="col" style="padding:4px 6px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                {{ String(fila[col] ?? '') }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="nota">Sin registros.</p>
        <p class="nota" style="margin-top:8px">Total: {{ total }}</p>
        <div style="display:flex; gap:8px; margin-top:8px" v-if="total > 50">
          <button class="btn btn-secondary btn-sm" :disabled="pagina === 1" @click="pagina--; cargar()">Anterior</button>
          <button class="btn btn-secondary btn-sm" :disabled="pagina * 50 >= total" @click="pagina++; cargar()">Siguiente</button>
        </div>
      </div>
    </div>
  </div>
</template>
