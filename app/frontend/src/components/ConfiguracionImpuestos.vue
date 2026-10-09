<template>
  <fieldset class="ci-fieldset">
    <legend class="ci-legend">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l5.5 2.5v3c0 3.5-2.3 6.3-5.5 7.5-3.2-1.2-5.5-4-5.5-7.5V4l5.5-2.5z" stroke="#4F46E5" stroke-width="1.3" stroke-linejoin="round"/></svg>
      Configuración tributaria
      <span class="ci-tag">Colombia</span>
    </legend>

    <!-- IVA (FR-009, FR-010) -->
    <label class="ci-row">
      <span class="ci-label">Régimen IVA</span>
      <label class="ci-check">
        <input type="checkbox" v-model="localIvaResponsable" @change="emitir" />
        Responsable de IVA
      </label>
    </label>
    <label v-if="localIvaResponsable" class="ci-row">
      <span class="ci-label">Tarifa IVA</span>
      <select v-model="localIvaTarifa" @change="emitir" class="ci-select">
        <option :value="19">General (19 %)</option>
        <option :value="5">Reducida (5 %)</option>
        <option :value="0">Excluido (0 %)</option>
      </select>
    </label>

    <!-- Retención en la fuente (FR-009, EC-2) -->
    <div v-if="clienteEsAgenteRetenedor" class="ci-section">
      <label class="ci-check">
        <input type="checkbox" v-model="localRetencionActivada" @change="emitir" />
        Retención en la fuente
      </label>
      <div v-if="localRetencionActivada" class="ci-row ci-indent">
        <label class="ci-row">
          <span class="ci-label">Concepto</span>
          <select v-model="localRetencionConcepto" @change="onConceptoChange" class="ci-select">
            <option value="honorarios">Honorarios</option>
            <option value="servicios">Servicios generales</option>
            <option value="compras">Compras</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </label>
        <label class="ci-row">
          <span class="ci-label">Porcentaje</span>
          <select v-if="localRetencionConcepto !== 'personalizado'" v-model="localRetencionPorcentaje" @change="emitir" class="ci-select">
            <option v-for="p in porcentajesConcepto" :key="p" :value="p">{{ p }} %</option>
          </select>
          <input v-else type="number" v-model.number="localRetencionPorcentaje" min="0" max="100" step="0.01" class="ci-input" @change="emitir" />
        </label>
      </div>
    </div>
    <p v-else class="ci-nota">No aplica retención: el cliente no es agente retenedor.</p>

    <!-- ReteIVA — solo persona jurídica (FR-009) -->
    <div v-if="localIvaResponsable && tipoEmisor === 'persona_juridica'" class="ci-section">
      <label class="ci-check">
        <input type="checkbox" v-model="localReteivaActivada" @change="emitir" />
        Retención de IVA (ReteIVA)
      </label>
      <label v-if="localReteivaActivada" class="ci-row ci-indent">
        <span class="ci-label">Porcentaje sobre IVA</span>
        <input type="number" v-model.number="localReteivaPorcentaje" min="0" max="100" step="0.01" class="ci-input" @change="emitir" />
        <span class="ci-unit">%</span>
      </label>
    </div>

    <!-- ReteICA (FR-009) -->
    <div class="ci-section">
      <label class="ci-check">
        <input type="checkbox" v-model="localReteicaActivada" @change="emitir" />
        Retención de ICA
      </label>
      <label v-if="localReteicaActivada" class="ci-row ci-indent">
        <span class="ci-label">Porcentaje</span>
        <input type="number" v-model.number="localReteicaPorcentaje" min="0" max="100" step="0.001" class="ci-input" @change="emitir" />
        <span class="ci-unit">%</span>
      </label>
    </div>

    <!-- Compensar retención (FR-012) -->
    <div v-if="localRetencionActivada && clienteEsAgenteRetenedor" class="ci-section">
      <label class="ci-check">
        <input type="checkbox" v-model="localCompensarRetencion" @change="emitir" />
        Compensar retención en el precio (el cliente paga el neto esperado)
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const PORCENTAJES = {
  honorarios: [10, 11],
  servicios: [4, 6],
  compras: [2.5, 3.5],
  personalizado: []
};

const props = defineProps({
  tipoEmisor: { type: String, default: 'persona_natural' },
  clienteEsAgenteRetenedor: { type: Boolean, default: false },
  ivaResponsable: { type: Boolean, default: true },
  ivaTarifa: { type: Number, default: 19 },
  retencionActivada: { type: Boolean, default: false },
  retencionConcepto: { type: String, default: 'servicios' },
  retencionPorcentaje: { type: Number, default: 6 },
  reteivaActivada: { type: Boolean, default: false },
  reteivaPorcentaje: { type: Number, default: 15 },
  reteicaActivada: { type: Boolean, default: false },
  reteicaPorcentaje: { type: Number, default: 0 },
  compensarRetencion: { type: Boolean, default: false }
});

const emit = defineEmits(['update:config']);

const localIvaResponsable = ref(props.ivaResponsable);
const localIvaTarifa = ref(props.ivaTarifa);
const localRetencionActivada = ref(props.retencionActivada);
const localRetencionConcepto = ref(props.retencionConcepto);
const localRetencionPorcentaje = ref(props.retencionPorcentaje);
const localReteivaActivada = ref(props.reteivaActivada);
const localReteivaPorcentaje = ref(props.reteivaPorcentaje);
const localReteicaActivada = ref(props.reteicaActivada);
const localReteicaPorcentaje = ref(props.reteicaPorcentaje);
const localCompensarRetencion = ref(props.compensarRetencion);

const porcentajesConcepto = computed(() => PORCENTAJES[localRetencionConcepto.value] || []);

function onConceptoChange() {
  const ps = PORCENTAJES[localRetencionConcepto.value];
  if (ps && ps.length > 0) localRetencionPorcentaje.value = ps[0];
  emitir();
}

function emitir() {
  emit('update:config', {
    ivaResponsable: localIvaResponsable.value,
    ivaTarifa: localIvaTarifa.value,
    retencionActivada: localRetencionActivada.value,
    retencionConcepto: localRetencionConcepto.value,
    retencionPorcentaje: localRetencionPorcentaje.value,
    reteivaActivada: localReteivaActivada.value,
    reteivaPorcentaje: localReteivaPorcentaje.value,
    reteicaActivada: localReteicaActivada.value,
    reteicaPorcentaje: localReteicaPorcentaje.value,
    compensarRetencion: localCompensarRetencion.value
  });
}
</script>

<style scoped>
.ci-fieldset {
  border: 1px solid var(--color-borde-light, #f1f5f9);
  border-radius: var(--radio-xl, 14px);
  background: var(--color-fondo, #fff);
  box-shadow: var(--sombra-card, 0 1px 3px rgba(15,23,42,0.05));
  padding: 1rem 1.1rem 1.1rem;
}
.ci-legend {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0 0.25rem;
  font-family: var(--font-heading, inherit);
}
.ci-tag {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-exito, #059669);
  background: #D1FAE5;
  border-radius: var(--radio-full, 9999px);
  padding: 2px 8px;
}
.ci-section { margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid var(--color-borde-light, #f1f5f9); }
.ci-row { display: flex; flex-direction: row; align-items: center; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; }
.ci-indent { margin-left: 1.5rem; }
.ci-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-texto-secundario, #475569); min-width: 120px; }
.ci-check { display: flex; flex-direction: row; align-items: center; gap: 0.6rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
.ci-select { padding: 0.4rem 0.6rem; border: 1px solid var(--color-borde-fuerte, #cbd5e1); border-radius: var(--radio-sm, 6px); font-size: 0.875rem; background: #fff; }
.ci-input { width: 80px; padding: 0.4rem 0.6rem; border: 1px solid var(--color-borde-fuerte, #cbd5e1); border-radius: var(--radio-sm, 6px); font-size: 0.875rem; }
.ci-unit { font-size: 0.875rem; color: var(--color-texto-secundario, #475569); }
.ci-nota { font-size: 0.8rem; color: var(--color-texto-placeholder, #94a3b8); margin-top: 0.4rem; }
</style>
