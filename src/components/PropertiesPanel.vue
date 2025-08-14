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
  <div class="p-4 bg-white h-full space-y-6">
    <h2 class="text-lg font-semibold text-gray-800">Propiedades</h2>

    <div v-if="elementoSeleccionado">
      <div class="mb-4">
        <span class="text-sm font-medium text-gray-500">Editando</span>
        <p class="text-lg font-semibold text-gray-900">{{ elementoSeleccionado.custom?.nombre || elementoSeleccionado.tipo }}</p>
        <p class="text-xs text-gray-400">ID: {{ elementoSeleccionado.id }}</p>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="mb-2 font-semibold text-gray-700">General</h3>
          <label class="block text-sm">
            <span class="font-medium text-gray-600">Nombre</span>
            <input type="text" class="mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                   :value="elementoSeleccionado.custom?.nombre || ''"
                   @input="updateCustom('nombre', $event.target.value)" />
          </label>
        </div>
        <div>
          <h3 class="mb-2 font-semibold text-gray-700">Transformación</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <label class="block">
              <span class="font-medium text-gray-600">Pos X</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                     :value="elementoSeleccionado.props.x"
                     @input="update('x', +$event.target.value)" />
            </label>
            <label class="block">
              <span class="font-medium text-gray-600">Pos Y</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                     :value="elementoSeleccionado.props.y"
                     @input="update('y', +$event.target.value)" />
            </label>
            <label class="block">
              <span class="font-medium text-gray-600">Ancho</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                     :value="elementoSeleccionado.props.ancho"
                     @input="update('ancho', +$event.target.value)" />
            </label>
            <label class="block">
              <span class="font-medium text-gray-600">Largo</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                     :value="elementoSeleccionado.props.largo"
                     @input="update('largo', +$event.target.value)" />
            </label>
            <label class="block col-span-2">
              <span class="font-medium text-gray-600">Rotación</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                     :value="elementoSeleccionado.props.rotation"
                     @input="update('rotation', +$event.target.value)" />
            </label>
          </div>
        </div>

        <div>
          <h3 class="mb-2 font-semibold text-gray-700">Apariencia</h3>
          <label class="block">
            <span class="font-medium text-gray-600">Color</span>
            <input type="color" class="mt-1 w-full h-10 rounded-md border-gray-300"
                   :value="elementoSeleccionado.custom.color"
                   @input="updateCustom('color', $event.target.value)" />
          </label>
        </div>

        <hr class="border-gray-200" />

        <div>
          <h3 class="mb-2 font-semibold text-gray-700">Acciones</h3>
          <button
            @click="eliminar"
            class="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="mb-4">
        <span class="text-sm font-medium text-gray-500">Planta actual</span>
        <p class="text-lg font-semibold text-gray-900">{{ plantaActual?.custom?.nombre || 'Planta' }}</p>
        <p class="text-xs text-gray-400">ID: {{ plantaActual?.id }}</p>
      </div>
      <div class="space-y-4" v-if="plantaActual">
        <div>
          <h3 class="mb-2 font-semibold text-gray-700">General</h3>
          <label class="block text-sm">
            <span class="font-medium text-gray-600">Nombre</span>
            <input type="text" class="mt-1 border-gray-300 rounded-md shadow-sm w-full"
                   :value="plantaActual.custom?.nombre || ''"
                   @input="store.actualizarElemento(plantaActual.id, null, { nombre: $event.target.value })" />
          </label>
        </div>
        <div>
          <h3 class="mb-2 font-semibold text-gray-700">Dimensiones</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <label class="block">
              <span class="font-medium text-gray-600">Ancho</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm w-full"
                     :value="plantaActual.props.ancho"
                     @input="store.actualizarElemento(plantaActual.id, { ancho: +$event.target.value })" />
            </label>
            <label class="block">
              <span class="font-medium text-gray-600">Largo</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm w-full"
                     :value="plantaActual.props.largo"
                     @input="store.actualizarElemento(plantaActual.id, { largo: +$event.target.value })" />
            </label>
            <label class="block col-span-2">
              <span class="font-medium text-gray-600">Altura</span>
              <input type="number" class="mt-1 border-gray-300 rounded-md shadow-sm w-full"
                     :value="plantaActual.props.altura"
                     @input="store.actualizarElemento(plantaActual.id, { altura: +$event.target.value })" />
            </label>
          </div>
        </div>
        
        <!-- Configuración de Grid si el elemento lo soporta -->
        <div v-if="plantaActual.tipo === 'planta' || plantaActual.custom?.grid">
          <h3 class="mb-2 font-semibold text-gray-700">Grid (contenedor)</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <label class="block">
              <span class="font-medium text-gray-600">Filas</span>
              <input type="number" min="0" class="mt-1 border-gray-300 rounded-md shadow-sm w-full"
                     :value="plantaActual.custom?.grid?.filas || 0"
                     @input="updatePlantaGrid('filas', +$event.target.value)" />
            </label>
            <label class="block">
              <span class="font-medium text-gray-600">Columnas</span>
              <input type="number" min="0" class="mt-1 border-gray-300 rounded-md shadow-sm w-full"
                     :value="plantaActual.custom?.grid?.columnas || 0"
                     @input="updatePlantaGrid('columnas', +$event.target.value)" />
            </label>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Grid activo: {{ plantaActual.custom?.grid ? 'Sí' : 'No' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
