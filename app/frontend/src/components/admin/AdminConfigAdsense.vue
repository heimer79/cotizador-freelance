<script setup>
import { ref, onMounted } from 'vue';
import { admin, configAds } from '../../api.js';

// Etiquetas legibles por ubicación conocida; si aparece un espacio nuevo se usa su id tal cual.
const ETIQUETAS_UBICACION = {
  'lista-cotizaciones': 'Lista de cotizaciones',
  'editor-cotizacion': 'Editor de cotización',
  'catalogo-servicios': 'Catálogo de servicios',
  'gestion-clientes': 'Gestión de clientes',
  perfil: 'Perfil'
};

const adsenseId = ref('');
const slots = ref([]); // [{ id, label, valor }]
const guardado = ref('');
const error = ref('');
const cargando = ref(true);

async function cargar() {
  try {
    const [configGuardada, configPublica] = await Promise.all([
      admin.config('adsense'),
      configAds.obtener()
    ]);
    adsenseId.value = configGuardada.config.adsense_id || '';

    const espaciosConSlot = configPublica.espacios.filter(
      (espacio) => espacio.tipo === 'adsense' || espacio.fallback === 'adsense'
    );
    slots.value = espaciosConSlot.map((espacio) => ({
      id: espacio.id,
      label: ETIQUETAS_UBICACION[espacio.ubicacion] || espacio.id,
      valor: configGuardada.config[`adsense_slot__${espacio.id}`] || ''
    }));
  } catch (e) { error.value = e.message; }
  finally { cargando.value = false; }
}

async function guardar() {
  error.value = ''; guardado.value = '';
  try {
    const payload = { adsense_id: adsenseId.value };
    for (const slot of slots.value) {
      payload[`adsense_slot__${slot.id}`] = slot.valor;
    }
    await admin.guardarConfig('adsense', payload);
    guardado.value = 'Configuración guardada.';
  } catch (e) { error.value = e.message; }
}

onMounted(cargar);
</script>

<template>
  <div class="card">
    <div class="card-header">Configuración de Google AdSense</div>
    <div class="card-body">
      <p v-if="cargando" class="nota">Cargando…</p>
      <template v-else>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="guardado" class="exito" role="status">{{ guardado }}</p>
        <form @submit.prevent="guardar" style="display:flex; flex-direction:column; gap:12px">
          <div>
            <label class="field-label">ID de cliente AdSense (ca-pub-...)</label>
            <input v-model="adsenseId" placeholder="ca-pub-XXXXXXXXXXXXXXXX">
          </div>
          <div v-if="slots.length" class="nota">Slot ID de cada espacio (lo generas al crear la unidad de anuncio en AdSense):</div>
          <div v-for="slot in slots" :key="slot.id">
            <label class="field-label">{{ slot.label }}</label>
            <input v-model="slot.valor" placeholder="0000000000">
          </div>
          <div>
            <button class="btn btn-primary" type="submit">Guardar</button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
