<script setup>
import { computed } from 'vue'
import { useInventarioStore } from '@/stores/inventario'
const store = useInventarioStore()

const elementoSeleccionado = computed(() => store.elementoSeleccionado)
const plantaActual = computed(() => store.elementoActual)

function update(prop, value) {
  if (!elementoSeleccionado.value) return
  store.actualizarElemento(elementoSeleccionado.value.id, { [prop]: value })
}

function updateCustom(prop, value) {
  if (!elementoSeleccionado.value) return
  store.actualizarElemento(elementoSeleccionado.value.id, null, { [prop]: value })
}

function eliminar() {
  if (elementoSeleccionado.value) {
    if (confirm(`¿Seguro que quieres eliminar "${elementoSeleccionado.value.tipo}"?`)) {
      store.eliminarElemento(elementoSeleccionado.value.id)
    }
  }
}

function updatePlantaGrid(prop, value) {
  if (!plantaActual.value) return
  const grid = { ...(plantaActual.value.custom?.grid || {}), [prop]: value }
  
  // Si ambos valores son 0, eliminar grid
  if (grid.filas <= 0 && grid.columnas <= 0) {
    const custom = { ...plantaActual.value.custom }
    delete custom.grid
    store.actualizarElemento(plantaActual.value.id, null, custom)
  } else if (grid.filas > 0 && grid.columnas > 0) {
    // Solo crear grid si ambos valores son positivos
    store.actualizarElemento(plantaActual.value.id, null, { grid })
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header elegante -->
    <div class="p-6 border-b border-slate-200/50">
      <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
        <div class="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
          </svg>
        </div>
        Propiedades
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Panel para elemento seleccionado -->
      <div v-if="elementoSeleccionado" class="p-6">
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 mb-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                 :style="{ backgroundColor: elementoSeleccionado.props.fill || '#6366f1' }">
              {{ elementoSeleccionado.shape === 'circle' ? '●' : '■' }}
            </div>
            <div>
              <h3 class="font-semibold text-slate-800">{{ elementoSeleccionado.custom?.nombre || elementoSeleccionado.tipo }}</h3>
              <div class="text-xs text-slate-500 font-mono">{{ elementoSeleccionado.id.substring(0, 8) }}</div>
            </div>
          </div>

          <!-- Propiedades básicas con mejor diseño -->
          <div class="space-y-4">
            <div class="bg-white/60 rounded-lg p-3 border border-blue-200/50">
              <label class="block text-xs font-semibold text-slate-600 mb-2">Nombre</label>
              <input 
                type="text" 
                :value="elementoSeleccionado.custom?.nombre || ''" 
                @input="updateCustom('nombre', $event.target.value)"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Sin nombre"
              />
            </div>

            <!-- Posición y dimensiones -->
            <div class="bg-white/60 rounded-lg p-4 border border-blue-200/50">
              <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                </svg>
                Transformación
              </h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">X</label>
                  <input 
                    type="number" 
                    :value="elementoSeleccionado.props.x" 
                    @input="update('x', +$event.target.value)"
                    class="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Y</label>
                  <input 
                    type="number" 
                    :value="elementoSeleccionado.props.y" 
                    @input="update('y', +$event.target.value)"
                    class="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Ancho</label>
                  <input 
                    type="number" 
                    :value="elementoSeleccionado.props.ancho" 
                    @input="update('ancho', +$event.target.value)"
                    class="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Largo</label>
                  <input 
                    type="number" 
                    :value="elementoSeleccionado.props.largo" 
                    @input="update('largo', +$event.target.value)"
                    class="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-slate-600 mb-1">Rotación</label>
                  <input 
                    type="number" 
                    :value="elementoSeleccionado.props.rotation" 
                    @input="update('rotation', +$event.target.value)"
                    class="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <!-- Acciones rápidas -->
            <div class="flex gap-2">
              <button 
                @click="eliminar()"
                class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel para planta actual -->
      <div v-if="plantaActual" class="p-6 border-t border-slate-200/50">
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
          <h3 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            Configuración de planta
          </h3>

          <div class="space-y-4">
            <!-- Grid configuration -->
            <div class="bg-white/60 rounded-lg p-3 border border-green-200/50">
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-semibold text-slate-600 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                  </svg>
                  Sistema de grillas
                </label>
              </div>
              
              <div v-if="plantaActual.custom?.grid" class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Filas</label>
                  <input 
                    type="number" 
                    :value="plantaActual.custom.grid.filas" 
                    @input="updatePlantaGrid('filas', parseFloat($event.target.value))"
                    class="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Columnas</label>
                  <input 
                    type="number" 
                    :value="plantaActual.custom.grid.cols" 
                    @input="updatePlantaGrid('cols', parseFloat($event.target.value))"
                    class="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              
              <div v-if="!plantaActual.custom?.grid" class="text-xs text-slate-500 italic text-center py-2">
                Un grid divide la planta en celdas para posicionamiento preciso
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vacío con mejor diseño -->
      <div v-if="!elementoSeleccionado && !plantaActual" class="p-6 flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-700 mb-2">Sin selección</h3>
          <p class="text-sm text-slate-500 max-w-xs">
            Selecciona un elemento en el canvas para ver y editar sus propiedades
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
