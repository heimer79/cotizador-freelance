<template>
  <div class="ledger">
    <div class="ledger-header">
      <h3>Liquidación financiera</h3>
      <span>COP</span>
    </div>
    <div class="ledger-body">
      <div class="ledger-row">
        <span class="ledger-row__label">Subtotal</span>
        <span class="ledger-row__value num-tabular">{{ fmt(totales.baseGravable) }}</span>
      </div>
      <div class="ledger-row" v-if="totales.iva > 0">
        <span class="ledger-row__label">IVA</span>
        <span class="ledger-row__value num-tabular">+ {{ fmt(totales.iva) }}</span>
      </div>
      <div class="ledger-row ledger-row--deduccion" v-if="totales.retencion > 0">
        <span class="ledger-row__label">− Retención en la fuente</span>
        <span class="ledger-row__value num-tabular">− {{ fmt(totales.retencion) }}</span>
      </div>
      <div class="ledger-row ledger-row--deduccion" v-if="totales.reteiva > 0">
        <span class="ledger-row__label">− ReteIVA</span>
        <span class="ledger-row__value num-tabular">− {{ fmt(totales.reteiva) }}</span>
      </div>
      <div class="ledger-row ledger-row--deduccion" v-if="totales.reteica > 0">
        <span class="ledger-row__label">− ReteICA</span>
        <span class="ledger-row__value num-tabular">− {{ fmt(totales.reteica) }}</span>
      </div>
      <div class="ledger-row" v-if="totales.compensacion > 0">
        <span class="ledger-row__label">Compensación retención</span>
        <span class="ledger-row__value num-tabular">+ {{ fmt(totales.compensacion) }}</span>
      </div>
    </div>
    <div class="ledger-total">
      <span class="ledger-total__label">Total neto a recibir</span>
      <span class="ledger-total__value num-tabular">{{ fmt(totales.totalNeto) }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  totales: {
    type: Object,
    default: () => ({ baseGravable: 0, iva: 0, retencion: 0, reteiva: 0, reteica: 0, compensacion: 0, totalNeto: 0 })
  }
});

const formato = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
function fmt(v) { return formato.format(v || 0); }
</script>
