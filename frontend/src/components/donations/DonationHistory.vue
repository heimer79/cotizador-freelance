<script setup>
import { onMounted } from 'vue';
import { useDonation } from '../../composables/useDonation.js';

const { historial, total, error, cargando, cargarHistorial } = useDonation();
const formato = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fecha = (iso) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(iso));
const ESTADOS = { pendiente: 'Pendiente', exitosa: 'Exitosa', fallida: 'Fallida', cancelada: 'Cancelada' };

onMounted(() => cargarHistorial());
</script>

<template>
  <section class="donacion-historial">
    <h3>Historial de donaciones</h3>
    <p v-if="cargando">Cargando…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="total === 0" class="nota">Aún no tienes donaciones registradas.</p>
    <ul v-else class="lista">
      <li v-for="d in historial" :key="d.id">
        <span>{{ fecha(d.fecha_creacion) }}</span>
        <strong>{{ formato.format(d.monto) }}</strong>
        <span class="badge">{{ ESTADOS[d.estado] }}</span>
      </li>
    </ul>
  </section>
</template>
