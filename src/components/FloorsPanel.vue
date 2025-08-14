<script setup>
import { computed, ref } from 'vue'
import { useInventarioStore } from '@/stores/inventario'

const store = useInventarioStore()

const plantas = computed(() => store.plantas)
const vistaActual = computed(() => store.proyecto.vistaActual)
const vistaModo = computed(() => store.proyecto.vistaModo)
const pared = computed(() => store.proyecto.pared)

const nombreNueva = ref('')

// Calcular elementos visibles en la pared actual
const elementosEnPared = computed(() => {
  const actual = store.elementoActual
  if (!actual || vistaModo.value === 'xy') return []
  
  const hijos = actual.hijos || []
  const umbral = 10
  const anchoPl = actual.props?.ancho || 1000
  const largoPl = actual.props?.largo || 1000
  
  if (vistaModo.value === 'zx') {
    if (pared.value === 'norte') {
      return hijos.filter(el => (el.props.y || 0) <= umbral)
    } else if (pared.value === 'sur') {
      return hijos.filter(el => ((el.props.y || 0) + (el.props.largo || 0)) >= (largoPl - umbral))
    }
  } else if (vistaModo.value === 'zy') {
    if (pared.value === 'oeste') {
      return hijos.filter(el => (el.props.x || 0) <= umbral)
    } else if (pared.value === 'este') {
      return hijos.filter(el => ((el.props.x || 0) + (el.props.ancho || 0)) >= (anchoPl - umbral))
    }
  }
  return []
})

function agregarPlanta() {
  const nombre = nombreNueva.value.trim()
  if (!nombre) return
  store.crearPlanta({ nombre })
  nombreNueva.value = ''
}

function seleccionar(id) {
  store.seleccionarPlanta(id)
}

function renombrar(planta) {
  const nuevoNombre = prompt('Nuevo nombre de la planta', planta.custom?.nombre || '')
  if (nuevoNombre != null) {
    store.renombrarPlanta(planta.id, nuevoNombre.trim())
  }
}

function eliminar(planta) {
  if (planta.hijos && planta.hijos.length) {
    alert('No se puede eliminar una planta con elementos dentro.')
    return
  }
  if (confirm(`¿Eliminar planta "${planta.custom?.nombre || planta.id}"?`)) {
    store.eliminarPlanta(planta.id)
  }
}
</script>

<template>
  <div class="px-6 py-4">
    <div class="flex items-center gap-4">
      <!-- Logo/Título -->
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <h1 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Editor de Plantas
        </h1>
      </div>

      <!-- Plantas tabs con diseño mejorado -->
      <div class="flex gap-2 overflow-x-auto py-1">
        <button
          v-for="pl in plantas"
          :key="pl.id"
          class="px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2"
          :class="pl.id === vistaActual 
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-md' 
            : 'bg-white/80 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'"
          @click="seleccionar(pl.id)"
          :title="pl.custom?.nombre || pl.id"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
          </svg>
          {{ pl.custom?.nombre || pl.id }}
        </button>
      </div>

      <!-- Controles de vista con iconos -->
      <div class="flex items-center gap-4 ml-auto">
        <div class="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-slate-200">
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          <label class="text-sm font-medium text-slate-600">Vista</label>
          <select class="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none" :value="vistaModo" @change="store.setVistaModo($event.target.value)">
            <option value="xy">XY Superior</option>
            <option value="zx">ZX Lateral N/S</option>
            <option value="zy">ZY Lateral E/O</option>
          </select>
        </div>
        
        <div v-if="vistaModo !== 'xy'" class="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-slate-200">
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
          </svg>
          <label class="text-sm font-medium text-slate-600">Pared</label>
          <select class="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none" :value="pared" @change="store.setPared($event.target.value)">
            <option value="norte">Norte</option>
            <option value="sur">Sur</option>
            <option value="este">Este</option>
            <option value="oeste">Oeste</option>
          </select>
        </div>

        <!-- Nueva planta con diseño mejorado -->
        <div class="flex items-center gap-2 bg-white/60 rounded-lg border border-slate-200">
          <input 
            v-model="nombreNueva" 
            type="text" 
            placeholder="Nueva planta"
            class="px-3 py-2 text-sm bg-transparent border-none focus:outline-none placeholder-slate-400" 
          />
          <button 
            @click="agregarPlanta"
            class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-md hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Agregar
          </button>
        </div>
      </div>
    </div>

    <!-- Info bar mejorada -->
    <div class="mt-3 flex items-center justify-between text-xs">
      <div class="flex items-center gap-4 text-slate-500">
        <span class="flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Click para seleccionar
        </span>
        <span v-if="vistaModo !== 'xy'" class="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6"/>
          </svg>
          Vista {{ vistaModo.toUpperCase() }} - Pared {{ pared }} • {{ elementosEnPared.length }} elementos
        </span>
      </div>
      
      <!-- Acciones rápidas -->
      <div class="flex gap-1">
        <template v-for="pl in plantas.slice(0, 3)" :key="pl.id">
          <button 
            @click="renombrar(pl)"
            class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs transition-colors flex items-center gap-1"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Renombrar
          </button>
          <button 
            @click="eliminar(pl)"
            class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs transition-colors flex items-center gap-1"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Eliminar
          </button>
        </template>
      </div>
    </div>
  </div>
</template>