<script setup>
import { ref, onMounted } from 'vue';
import { clientes as apiClientes } from '../api.js';
import DirectAdSlot from '../components/ads/DirectAdSlot.vue';

const CLIENTE_VACIO = { nombre: '', documento: '', contacto: '', tipo: 'persona_juridica', agenteRetenedor: false };

const lista = ref([]);
const error = ref('');
const editando = ref(null);
const formulario = ref({ ...CLIENTE_VACIO });

async function cargar() {
  try {
    lista.value = await apiClientes.listar();
  } catch (e) {
    error.value = e.message;
  }
}

function nuevoFormulario() {
  editando.value = null;
  formulario.value = { ...CLIENTE_VACIO };
}

function editar(cliente) {
  editando.value = cliente.id;
  formulario.value = { nombre: cliente.nombre, documento: cliente.documento || '', contacto: cliente.contacto || '', tipo: cliente.tipo, agenteRetenedor: cliente.agenteRetenedor };
}

async function guardar() {
  error.value = '';
  try {
    if (editando.value) {
      await apiClientes.actualizar(editando.value, formulario.value);
    } else {
      await apiClientes.crear(formulario.value);
    }
    nuevoFormulario();
    await cargar();
  } catch (e) {
    error.value = e.message;
  }
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este cliente? Las cotizaciones ya creadas no se verán afectadas.')) return;
  try {
    await apiClientes.eliminar(id);
    await cargar();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(cargar);
</script>

<template>
  <section class="page-container">
    <div class="cabecera-seccion">
      <h2>Clientes</h2>
      <span class="nota">{{ lista.length }} registrados</span>
    </div>

    <DirectAdSlot espacio-id="adsense-clientes" />

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="grid-2" style="margin-bottom: 24px">
      <!-- Formulario -->
      <div class="card">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
          {{ editando ? 'Editar cliente' : 'Nuevo cliente' }}
        </div>
        <form class="card-body" style="display: flex; flex-direction: column; gap: 12px" @submit.prevent="guardar">
          <div>
            <label class="field-label">Nombre o razón social</label>
            <input v-model="formulario.nombre" placeholder="Nombre del cliente" required>
          </div>
          <div class="fila-doble">
            <div>
              <label class="field-label">NIT / Cédula</label>
              <input v-model="formulario.documento" placeholder="Opcional" inputmode="numeric">
            </div>
            <div>
              <label class="field-label">Contacto</label>
              <input v-model="formulario.contacto" placeholder="Teléfono o correo">
            </div>
          </div>
          <div>
            <label class="field-label">Tipo de cliente</label>
            <select v-model="formulario.tipo">
              <option value="persona_juridica">Persona jurídica (empresa, sociedad)</option>
              <option value="persona_natural">Persona natural</option>
            </select>
          </div>
          <div class="retencion-toggle">
            <div style="display: flex; align-items: center; gap: 10px">
              <input v-model="formulario.agenteRetenedor" type="checkbox" style="width: 20px; height: 20px; min-height: auto; accent-color: var(--color-primario)">
              <div>
                <div style="font-size: 13px; font-weight: 600; color: #312E81">Agente retenedor de la fuente</div>
                <div style="font-size: 11px; color: var(--color-texto-secundario)">Solo los agentes retenedores permiten aplicar retención</div>
              </div>
            </div>
          </div>
          <div class="acciones" style="margin: 0">
            <button class="btn btn-primary" type="submit">{{ editando ? 'Guardar cambios' : 'Añadir cliente' }}</button>
            <button v-if="editando" class="btn btn-secondary" type="button" @click="nuevoFormulario">Cancelar</button>
          </div>
        </form>
      </div>

      <!-- Lista -->
      <div class="card">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="#6B7280" stroke-width="1.4"/><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#6B7280" stroke-width="1.4" stroke-linecap="round"/></svg>
          Mis clientes
        </div>
        <div v-if="lista.length === 0" class="card-body">
          <p class="nota" style="margin: 0">Aún no tienes clientes registrados.</p>
        </div>
        <table v-else class="lineas">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Documento</th>
              <th style="text-align: right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cliente in lista" :key="cliente.id">
              <td>
                <div style="font-weight: 600">{{ cliente.nombre }}</div>
                <div v-if="cliente.contacto" style="font-size: 12px; color: var(--color-texto-secundario)">{{ cliente.contacto }}</div>
              </td>
              <td>
                <span class="badge" :class="{ emitida: cliente.agenteRetenedor }">
                  {{ cliente.tipo === 'persona_juridica' ? 'Jurídica' : 'Natural' }}
                </span>
              </td>
              <td style="color: var(--color-texto-secundario)">{{ cliente.documento || '—' }}</td>
              <td style="text-align: right">
                <div class="acciones-linea">
                  <button class="btn btn-accent btn-sm" @click="editar(cliente)">Editar</button>
                  <button class="btn btn-danger btn-sm" @click="eliminar(cliente.id)">Eliminar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
