<template>
  <div class="logo-uploader">
    <label class="logo-label">
      <span v-if="!modelValue" class="logo-placeholder">
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span>{{ label }}</span>
      </span>
      <img v-else :src="modelValue" alt="Logo" class="logo-preview" />
      <input
        ref="inputRef"
        type="file"
        accept="image/jpeg,image/png"
        class="logo-input-hidden"
        @change="onFileChange"
      />
    </label>
    <button v-if="modelValue" type="button" class="logo-remove-btn" @click.prevent="remove" title="Quitar logo">✕</button>
    <p v-if="errorMsg" class="logo-error">{{ errorMsg }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Subir logo (JPG/PNG, máx 2 MB)' }
});
const emit = defineEmits(['update:modelValue', 'error']);

const errorMsg = ref('');
const inputRef = ref(null);

function onFileChange(event) {
  errorMsg.value = '';
  const file = event.target.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    errorMsg.value = 'Solo se admiten imágenes JPG o PNG';
    emit('error', errorMsg.value);
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = 'El logo no puede superar 2 MB';
    emit('error', errorMsg.value);
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    emit('update:modelValue', e.target.result);
  };
  reader.readAsDataURL(file);
  if (inputRef.value) inputRef.value.value = '';
}

function remove() {
  emit('update:modelValue', '');
}
</script>

<style scoped>
.logo-uploader { display: inline-flex; align-items: center; gap: 0.5rem; }
.logo-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
  position: relative;
}
.logo-label:hover { border-color: #6b7280; }
.logo-placeholder { display: flex; flex-direction: column; align-items: center; color: #9ca3af; font-size: 0.65rem; text-align: center; padding: 4px; gap: 4px; }
.logo-preview { width: 100%; height: 100%; object-fit: contain; }
.logo-input-hidden { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.logo-remove-btn { background: none; border: none; color: #6b7280; font-size: 1rem; cursor: pointer; padding: 4px; }
.logo-remove-btn:hover { color: #ef4444; }
.logo-error { color: #ef4444; font-size: 0.75rem; margin: 0; }
</style>
