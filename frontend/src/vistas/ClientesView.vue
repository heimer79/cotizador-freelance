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
  <section>
    <h2>Clientes</h2>
    <DirectAdSlot espacio-id="adsense-clientes" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <form class="formulario" @submit.prevent="guardar">
      <input v-model="formulario.nombre" placeholder="Nombre o razón social" required />
      <input v-model="formulario.documento" placeholder="NIT o cédula del cliente (opcional)" inputmode="numeric" />
      <input v-model="formulario.contacto" placeholder="Contacto (teléfono o correo)" />
      <label>
        Tipo de cliente
        <select v-model="formulario.tipo">
          <option value="persona_juridica">Persona jurídica (empresa, sociedad)</option>
          <option value="persona_natural">Persona natural</option>
        </select>
      </label>
      <label class="casilla">
        <input v-model="formulario.agenteRetenedor" type="checkbox" />
        Es agente retenedor de la fuente
      </label>
      <p class="nota">Solo los agentes retenedores permiten aplicar retención en la fuente a la cotización.</p>
      <button type="submit">{{ editando ? 'Guardar cambios' : 'Añadir cliente' }}</button>
      <button v-if="editando" type="button" class="secundario" @click="nuevoFormulario">Cancelar</button>
    </form>

    <ul class="lista">
      <li v-for="cliente in lista" :key="cliente.id">
        <strong>{{ cliente.nombre }}</strong>
        <span class="nota">
          {{ cliente.tipo === 'persona_juridica' ? 'Persona jurídica' : 'Persona natural' }}
          · {{ cliente.agenteRetenedor ? 'Agente retenedor' : 'No agente retenedor' }}
        </span>
        <div v-if="cliente.documento || cliente.contacto">{{ cliente.documento }} {{ cliente.contacto }}</div>
        <div class="acciones">
          <button class="secundario" @click="editar(cliente)">Editar</button>
          <button class="peligro" @click="eliminar(cliente.id)">Eliminar</button>
        </div>
      </li>
    </ul>
  </section>
</template>
