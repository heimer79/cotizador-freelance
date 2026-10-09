<template>
  <form class="nuevo-cliente-form" @submit.prevent="guardar">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
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
      <button class="btn btn-primary" type="submit" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Añadir cliente' }}</button>
    </div>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { clientes as apiClientes } from '../api.js';

const emit = defineEmits(['creado']);

const CLIENTE_VACIO = { nombre: '', documento: '', contacto: '', tipo: 'persona_juridica', agenteRetenedor: false };
const formulario = ref({ ...CLIENTE_VACIO });
const error = ref('');
const guardando = ref(false);

async function guardar() {
  error.value = '';
  guardando.value = true;
  try {
    const nuevo = await apiClientes.crear(formulario.value);
    formulario.value = { ...CLIENTE_VACIO };
    emit('creado', nuevo);
  } catch (e) {
    error.value = e.message;
  } finally {
    guardando.value = false;
  }
}
</script>

<style scoped>
.nuevo-cliente-form { display: flex; flex-direction: column; gap: 12px; }
</style>
