<template>
  <div class="es-container">
    <label class="es-label">Emisor de la cotización</label>

    <select v-if="emisores.length > 1" v-model="seleccionadoLocal" class="es-select" @change="onCambio">
      <option v-for="e in emisores" :key="e.id" :value="e.id">
        {{ e.nombre }}{{ e.esPrincipal ? ' (principal)' : '' }}
      </option>
    </select>

    <p v-if="emisorActual" class="es-preview">
      <strong>{{ emisorActual.nombre || 'Sin nombre registrado' }}</strong>
      <span v-if="emisorActual.documento"> · NIT/CC: {{ emisorActual.documento }}</span>
      · {{ emisorActual.tipoEmisor === 'persona_juridica' ? 'Persona jurídica' : 'Persona natural' }}
    </p>
    <p v-else class="es-preview">Aún no tienes datos de emisor registrados.</p>

    <div class="es-acciones">
      <button type="button" class="btn btn-secondary btn-sm" @click="alternarEdicion">
        {{ editando && !creandoNuevo ? 'Cancelar' : 'Editar datos del emisor' }}
      </button>
      <button v-if="esPremium && emisores.length < 5" type="button" class="btn btn-secondary btn-sm" @click="abrirCreacion">
        + Nuevo emisor
      </button>
    </div>

    <form v-if="editando" class="es-form" @submit.prevent="guardar">
      <div class="fila-doble">
        <div>
          <label class="field-label">Nombre / Razón social</label>
          <input v-model="form.nombre" placeholder="Tu nombre o empresa" required>
        </div>
        <div>
          <label class="field-label">NIT / Documento</label>
          <input v-model="form.documento" placeholder="Número de documento">
        </div>
      </div>
      <div class="fila-doble">
        <div>
          <label class="field-label">Tipo</label>
          <select v-model="form.tipoEmisor">
            <option value="persona_natural">Persona natural</option>
            <option value="persona_juridica">Persona jurídica</option>
          </select>
        </div>
        <div v-if="esPrincipalEditando">
          <label class="field-label">Régimen tributario</label>
          <select v-model="form.regimen">
            <option value="" disabled>Elige tu régimen</option>
            <option value="ordinario">Régimen ordinario</option>
            <option value="simple">Régimen simple de tributación (SIMPLE)</option>
            <option value="no_responsable_iva">No responsable de IVA</option>
          </select>
        </div>
      </div>

      <div v-if="esPrincipalEditando">
        <label class="field-label">Contacto</label>
        <input v-model="form.contacto" placeholder="Teléfono o correo">
      </div>
      <div v-else class="fila-doble">
        <div>
          <label class="field-label">Correo</label>
          <input v-model="form.email" type="email" placeholder="correo@empresa.com">
        </div>
        <div>
          <label class="field-label">Teléfono</label>
          <input v-model="form.telefono" type="tel" placeholder="+57 310 000 0000">
        </div>
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" type="submit" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar emisor' }}</button>
        <button v-if="!esPrincipalEditando && !creandoNuevo" type="button" class="btn btn-danger btn-sm" @click="eliminar">Eliminar emisor</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { perfil as apiPerfil } from '../api.js';

const props = defineProps({
  modelValue: { type: Number, default: null },
  tipoCuenta: { type: String, default: 'gratuita' }
});
const emit = defineEmits(['update:modelValue', 'change']);

const emisores = ref([]);
const seleccionadoLocal = ref(props.modelValue);
const editando = ref(false);
const creandoNuevo = ref(false);
const guardando = ref(false);
const error = ref('');
const form = ref({ nombre: '', documento: '', tipoEmisor: 'persona_natural', regimen: '', contacto: '', email: '', telefono: '' });

const esPremium = computed(() => props.tipoCuenta === 'premium' || props.tipoCuenta === 'admin');
const emisorActual = computed(() => emisores.value.find((e) => e.id === seleccionadoLocal.value) || null);
// El emisor principal también vive en la tabla `perfil` (régimen, contacto, aviso de "perfil incompleto");
// los emisores adicionales (premium) solo existen en la tabla `emisores`, con campos propios (correo/teléfono).
const esPrincipalEditando = computed(() => !creandoNuevo.value && !!(emisorActual.value && emisorActual.value.esPrincipal));

watch(() => props.modelValue, (v) => {
  if (v !== seleccionadoLocal.value) seleccionadoLocal.value = v;
});

async function cargar() {
  try {
    const res = await apiPerfil.emisores();
    emisores.value = res || [];
    if (!seleccionadoLocal.value && emisores.value.length > 0) {
      const principal = emisores.value.find((e) => e.esPrincipal) || emisores.value[0];
      seleccionadoLocal.value = principal.id;
      emit('update:modelValue', principal.id);
      emit('change', principal);
    }
  } catch {
    emisores.value = [];
  }
}

onMounted(cargar);

function onCambio() {
  emit('update:modelValue', seleccionadoLocal.value);
  emit('change', emisorActual.value);
  editando.value = false;
  creandoNuevo.value = false;
}

async function alternarEdicion() {
  error.value = '';
  if (editando.value && !creandoNuevo.value) {
    editando.value = false;
    return;
  }
  creandoNuevo.value = false;
  if (!emisorActual.value) return;

  if (emisorActual.value.esPrincipal) {
    try {
      const p = await apiPerfil.obtener();
      form.value = {
        nombre: p.nombre || emisorActual.value.nombre || '',
        documento: p.nit || emisorActual.value.documento || '',
        tipoEmisor: p.tipoEmisor || emisorActual.value.tipoEmisor || 'persona_natural',
        regimen: p.regimen || '',
        contacto: p.contacto || '',
        email: '',
        telefono: ''
      };
    } catch {
      form.value = {
        ...form.value,
        nombre: emisorActual.value.nombre,
        documento: emisorActual.value.documento,
        tipoEmisor: emisorActual.value.tipoEmisor
      };
    }
  } else {
    form.value = {
      nombre: emisorActual.value.nombre || '',
      documento: emisorActual.value.documento || '',
      tipoEmisor: emisorActual.value.tipoEmisor || 'persona_natural',
      regimen: '',
      contacto: '',
      email: emisorActual.value.email || '',
      telefono: emisorActual.value.telefono || ''
    };
  }
  editando.value = true;
}

function abrirCreacion() {
  error.value = '';
  creandoNuevo.value = true;
  form.value = { nombre: '', documento: '', tipoEmisor: 'persona_natural', regimen: '', contacto: '', email: '', telefono: '' };
  editando.value = true;
}

async function guardar() {
  error.value = '';
  guardando.value = true;
  try {
    if (creandoNuevo.value) {
      const creado = await apiPerfil.crearEmisor({
        nombre: form.value.nombre,
        documento: form.value.documento,
        tipoEmisor: form.value.tipoEmisor,
        email: form.value.email,
        telefono: form.value.telefono
      });
      emisores.value.push(creado);
      seleccionadoLocal.value = creado.id;
      emit('update:modelValue', creado.id);
      emit('change', creado);
    } else if (esPrincipalEditando.value) {
      const actualizado = await apiPerfil.guardar({
        nombre: form.value.nombre,
        nit: form.value.documento,
        contacto: form.value.contacto,
        regimen: form.value.regimen,
        tipoEmisor: form.value.tipoEmisor
      });
      const idx = emisores.value.findIndex((e) => e.id === emisorActual.value.id);
      const fusionado = idx >= 0
        ? { ...emisores.value[idx], nombre: actualizado.nombre, documento: actualizado.nit, tipoEmisor: actualizado.tipoEmisor }
        : emisorActual.value;
      if (idx >= 0) emisores.value[idx] = fusionado;
      emit('change', fusionado);
    } else {
      const actualizado = await apiPerfil.actualizarEmisor(emisorActual.value.id, {
        nombre: form.value.nombre,
        documento: form.value.documento,
        tipoEmisor: form.value.tipoEmisor,
        email: form.value.email,
        telefono: form.value.telefono
      });
      const idx = emisores.value.findIndex((e) => e.id === actualizado.id);
      if (idx >= 0) emisores.value[idx] = actualizado;
      emit('change', actualizado);
    }
    editando.value = false;
    creandoNuevo.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    guardando.value = false;
  }
}

async function eliminar() {
  if (!emisorActual.value || emisorActual.value.esPrincipal) return;
  if (!confirm(`¿Eliminar el emisor "${emisorActual.value.nombre}"?`)) return;
  try {
    await apiPerfil.eliminarEmisor(emisorActual.value.id);
    emisores.value = emisores.value.filter((e) => e.id !== emisorActual.value.id);
    const principal = emisores.value.find((e) => e.esPrincipal) || emisores.value[0] || null;
    seleccionadoLocal.value = principal ? principal.id : null;
    emit('update:modelValue', seleccionadoLocal.value);
    emit('change', principal);
    editando.value = false;
  } catch (e) {
    error.value = e.message;
  }
}

defineExpose({ emisores, emisorActual, recargar: cargar });
</script>

<style scoped>
.es-container { display: flex; flex-direction: column; gap: 0.4rem; }
.es-label { font-size: 0.8rem; font-weight: 500; color: #374151; }
.es-select {
  padding: 0.4rem 0.6rem; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.875rem; background: #fff; cursor: pointer;
}
.es-select:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
.es-preview { font-size: 0.8rem; color: #374151; margin: 0; }
.es-acciones { display: flex; gap: 8px; flex-wrap: wrap; }
.es-form {
  margin-top: 6px; padding: 12px; border: 1px solid var(--color-borde, #e5e7eb); border-radius: 8px;
  display: flex; flex-direction: column; gap: 10px; background: #f9fafb;
}
</style>
