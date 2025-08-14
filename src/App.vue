<script setup>
import FloorsPanel from '@/components/FloorsPanel.vue'
import Sidebar from '@/components/Sidebar.vue'
import CanvasView from '@/components/CanvasView.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import { onMounted, onBeforeUnmount } from 'vue'
import { useInventarioStore } from '@/stores/inventario'

const store = useInventarioStore()

function handleKey(e) {
  // Ctrl+Z / Cmd+Z => Undo
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
  }
  // Ctrl+Y or Ctrl+Shift+Z => Redo
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault()
    store.redo()
  }
  // Delete/Supr => Eliminar seleccionado
  const target = e.target
  const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace')) {
    if (store.elementoSeleccionado) {
      e.preventDefault()
      store.eliminarElemento(store.elementoSeleccionado.id)
    }
  }
  // ESC => Deseleccionar
  if (e.key === 'Escape') {
    store.seleccionarElemento(null)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header con gradiente y sombra -->
    <div class="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
      <FloorsPanel />
    </div>
    <!-- Main content con paneles redondeados -->
    <div class="flex-1 flex gap-3 p-3">
      <!-- Sidebar izquierda -->
      <div class="w-72 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-lg overflow-hidden">
        <Sidebar />
      </div>
      <!-- Canvas central -->
      <div class="flex-1 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-lg overflow-hidden">
        <CanvasView />
      </div>
      <!-- Panel de propiedades derecha -->
      <div class="w-80 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-lg overflow-hidden">
        <PropertiesPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
