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
  <div class="px-4 py-2">
  <div class="flex items-center gap-3">
      <div class="flex gap-2 overflow-x-auto py-2">
        <button
          v-for="pl in plantas"
          :key="pl.id"
          class="px-3 py-1 rounded-full border text-sm whitespace-nowrap"
          :class="pl.id === vistaActual ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'"
          @click="seleccionar(pl.id)"
          :title="pl.custom?.nombre || pl.id"
        >{{ pl.custom?.nombre || pl.id }}</button>
      </div>
      <div class="flex items-center gap-4 ml-auto">
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600">Vista</label>
          <select class="border rounded px-2 py-1 text-sm" :value="vistaModo" @change="store.setVistaModo($event.target.value)">
            <option value="xy">XY (superior)</option>
            <option value="zx">ZX (lateral N/S)</option>
            <option value="zy">ZY (lateral E/O)</option>
          </select>
        </div>
        <div class="flex items-center gap-2" v-if="vistaModo !== 'xy'">
          <label class="text-xs text-gray-600">Pared</label>
          <select class="border rounded px-2 py-1 text-sm" :value="pared" @change="store.setPared($event.target.value)">
            <option value="norte">Norte</option>
            <option value="sur">Sur</option>
            <option value="este">Este</option>
            <option value="oeste">Oeste</option>
          </select>
        </div>
        <input v-model="nombreNueva" type="text" placeholder="Nueva planta"
               class="border rounded px-2 py-1 text-sm" />
        <button class="bg-emerald-600 text-white text-sm px-3 py-1 rounded" @click="agregarPlanta">Agregar</button>
      </div>
    </div>

    <div class="mt-2 text-xs text-gray-500">
      <span>Acciones: </span>
      <span>Click para seleccionar • </span>
      <span>Click derecho (o botón) para renombrar/eliminar</span>
      <span v-if="vistaModo !== 'xy'" class="ml-2 text-blue-600">
        • Vista {{ vistaModo.toUpperCase() }} - Pared {{ pared }} • 
        Elementos visibles: {{ elementosEnPared.length }}
      </span>
    </div>

    <div class="mt-2 flex gap-2 flex-wrap">
      <template v-for="pl in plantas" :key="pl.id">
        <button class="text-xs px-2 py-1 bg-gray-100 rounded" @click="renombrar(pl)">Renombrar: {{ pl.custom?.nombre || pl.id }}</button>
        <button class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded" @click="eliminar(pl)">Eliminar</button>
      </template>
    </div>
  </div>
</template>
