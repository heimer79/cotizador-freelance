<script setup>
import { ref, inject } from 'vue';
import { suscripcion as apiSuscripcion } from '../api.js';
import { useAuth } from '../composables/useAuth.js';

const { usuario, isPremium } = useAuth();
const toast = inject('toast', null);
const iniciandoPago = ref(false);

async function iniciarSuscripcion() {
  if (!usuario.value) {
    window.dispatchEvent(new CustomEvent('mostrar-login'));
    return;
  }
  iniciandoPago.value = true;
  try {
    const { urlPago } = await apiSuscripcion.crear({ modalidad: 'automatica' });
    window.location.href = urlPago;
  } catch (e) {
    toast?.value?.mostrar({ mensaje: e.message, tipo: 'error' });
    iniciandoPago.value = false;
  }
}

const caracteristicas = [
  { nombre: 'Cotizaciones', gratuita: 'Temporales (se eliminan en 24 h)', premium: 'Hasta 500 permanentes' },
  { nombre: 'Clientes guardados', gratuita: 'No disponible', premium: 'Hasta 200 clientes' },
  { nombre: 'Grupos de clientes', gratuita: 'No disponible', premium: 'Incluido' },
  { nombre: 'PDF para WhatsApp', gratuita: 'No disponible', premium: 'Incluido' },
  { nombre: 'Catálogo de servicios', gratuita: 'Incluido', premium: 'Incluido' },
  { nombre: 'Perfil profesional', gratuita: 'Incluido', premium: 'Incluido' },
  { nombre: 'Sin publicidad', gratuita: 'No', premium: 'Sí' },
  { nombre: 'Soporte', gratuita: 'Comunidad', premium: 'Prioritario por correo' }
];
</script>

<template>
  <section class="page-container planes-view">
    <div class="cabecera-seccion" style="text-align:center; margin-bottom:32px">
      <h2>Planes</h2>
      <p class="nota">Elige el plan que mejor se adapta a tu negocio</p>
    </div>

    <div class="planes-grid">
      <!-- Plan gratuito -->
      <div class="plan-card">
        <div class="plan-encabezado">
          <h3>Gratuito</h3>
          <div class="plan-precio">$0 <span>/ siempre</span></div>
        </div>
        <ul class="plan-lista">
          <li>Cotizaciones temporales</li>
          <li>Catálogo de servicios</li>
          <li>Perfil profesional</li>
          <li class="deshabilitado">Sin clientes guardados</li>
          <li class="deshabilitado">Sin grupos</li>
          <li class="deshabilitado">Sin compartir por WhatsApp</li>
          <li class="deshabilitado">Con publicidad</li>
        </ul>
        <div class="plan-cta">
          <span class="badge-actual" v-if="!isPremium">Tu plan actual</span>
          <span v-else class="nota">Plan gratuito</span>
        </div>
      </div>

      <!-- Plan premium -->
      <div class="plan-card plan-premium">
        <div class="plan-encabezado">
          <div class="plan-badge">Recomendado</div>
          <h3>Premium</h3>
          <div class="plan-precio">$20 USD <span>/ año</span></div>
        </div>
        <ul class="plan-lista">
          <li>Hasta 500 cotizaciones permanentes</li>
          <li>Hasta 200 clientes guardados</li>
          <li>Grupos de clientes</li>
          <li>Compartir por WhatsApp (PDF)</li>
          <li>Catálogo de servicios</li>
          <li>Perfil profesional</li>
          <li>Sin publicidad</li>
          <li>Soporte prioritario</li>
        </ul>
        <div class="plan-cta">
          <span v-if="isPremium" class="badge-actual">Tu plan actual</span>
          <button v-else class="btn btn-primary" :disabled="iniciandoPago" @click="iniciarSuscripcion">
            {{ iniciandoPago ? 'Redirigiendo…' : 'Suscribirse por $20 USD/año' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla comparativa -->
    <div class="tabla-comparativa">
      <h3 style="text-align:center; margin-bottom:16px">Comparativa detallada</h3>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Característica</th>
              <th>Gratuito</th>
              <th>Premium</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in caracteristicas" :key="c.nombre">
              <td>{{ c.nombre }}</td>
              <td>{{ c.gratuita }}</td>
              <td class="col-premium">{{ c.premium }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="nota" style="text-align:center; margin-top:24px">
      El pago se procesa de forma segura a través de MercadoPago. Cancela en cualquier momento desde tu perfil.
    </p>
  </section>
</template>

<style scoped>
.planes-view { max-width: 900px; margin: 0 auto; }

.planes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 40px;
}
@media (max-width: 600px) { .planes-grid { grid-template-columns: 1fr; } }

.plan-card {
  border: 1px solid var(--color-borde, #e5e7eb);
  border-radius: 12px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  background: var(--color-fondo-tarjeta, #fff);
}
.plan-premium {
  border-color: var(--color-primario, #2563eb);
  box-shadow: 0 4px 24px rgba(37,99,235,0.12);
  position: relative;
}
.plan-encabezado { margin-bottom: 20px; }
.plan-badge {
  display: inline-block;
  background: var(--color-primario, #2563eb);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}
.plan-precio {
  font-size: 2rem;
  font-weight: 700;
  margin-top: 8px;
}
.plan-precio span { font-size: 1rem; font-weight: 400; color: var(--color-texto-secundario, #6b7280); }

.plan-lista {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.plan-lista li::before { content: '✓ '; color: var(--color-exito, #16a34a); font-weight: 700; }
.plan-lista li.deshabilitado::before { content: '✕ '; color: var(--color-error, #dc2626); }
.plan-lista li.deshabilitado { color: var(--color-texto-secundario, #6b7280); }

.plan-cta { margin-top: auto; }
.badge-actual {
  display: inline-block;
  background: var(--color-exito-fondo, #dcfce7);
  color: var(--color-exito, #16a34a);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 0.85rem;
  font-weight: 600;
}

.tabla-comparativa table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.tabla-comparativa th, .tabla-comparativa td {
  padding: 10px 12px;
  border: 1px solid var(--color-borde, #e5e7eb);
  text-align: left;
}
.tabla-comparativa th { background: var(--color-fondo-alt, #f9fafb); font-weight: 600; }
.col-premium { color: var(--color-primario, #2563eb); font-weight: 500; }
</style>
