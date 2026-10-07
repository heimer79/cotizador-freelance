<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDonation } from '../../composables/useDonation.js';

const MONTOS_SUGERIDOS = [5000, 10000, 20000, 50000];
const MINIMO = 2000;
const MAXIMO = 500000;

const { error, iniciarDonacion, cargarHistorial, historial } = useDonation();
const seleccionado = ref(10000);
const personalizado = ref('');
const enviando = ref(false);
const retorno = ref(null);

const montoFinal = computed(() => (personalizado.value ? Number(personalizado.value) : seleccionado.value));
const montoValido = computed(() => Number.isInteger(montoFinal.value) && montoFinal.value >= MINIMO && montoFinal.value <= MAXIMO);

const formato = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

async function donar() {
  if (!montoValido.value) return;
  enviando.value = true;
  await iniciarDonacion(montoFinal.value);
  enviando.value = false;
}

// Al volver de Wompi, la URL trae ?donacion=ID. El estado real lo confirma el webhook, así que puede seguir pendiente.
onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('donacion')) return;

  const id = Number(params.get('donacion'));
  await cargarHistorial();
  const donacion = historial.value.find((d) => d.id === id);
  retorno.value = donacion ? donacion.estado : 'pendiente';
  window.history.replaceState({}, '', window.location.pathname);
});
</script>

<template>
  <section class="donacion">
    <h3>Donación voluntaria</h3>
    <p class="nota">
      Quotizador es gratuito. Si te sirve, puedes apoyarlo con una donación voluntaria. Es no reembolsable y no
      implica beneficios adicionales.
    </p>

    <p v-if="retorno === 'exitosa'" class="exito">¡Gracias por tu donación! Te enviamos la confirmación por correo.</p>
    <p v-else-if="retorno === 'pendiente'" class="nota">Estamos confirmando tu pago. Revisa el historial en unos minutos.</p>
    <p v-else-if="retorno === 'fallida' || retorno === 'cancelada'" class="error">
      El pago no se completó. No se realizó ningún cobro; puedes intentarlo de nuevo.
    </p>

    <div class="montos">
      <button
        v-for="monto in MONTOS_SUGERIDOS"
        :key="monto"
        type="button"
        :class="{ activa: !personalizado && seleccionado === monto }"
        class="secundario"
        @click="seleccionado = monto; personalizado = ''"
      >
        {{ formato.format(monto) }}
      </button>
    </div>

    <label>
      Otro monto (COP, entre $2.000 y $500.000)
      <input v-model="personalizado" type="number" inputmode="numeric" min="2000" max="500000" step="1" />
    </label>

    <p v-if="personalizado && !montoValido" class="error">El monto debe estar entre $2.000 y $500.000 COP.</p>
    <p v-if="error" class="error">{{ error }}</p>

    <button type="button" :disabled="!montoValido || enviando" @click="donar">
      {{ enviando ? 'Abriendo pasarela…' : `Donar ${formato.format(montoFinal || 0)}` }}
    </button>
  </section>
</template>
