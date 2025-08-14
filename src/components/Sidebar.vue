<script setup>
import { reactive } from 'vue'
import { useInventarioStore } from '@/stores/inventario'
import { storeToRefs } from 'pinia'
import { useCatalogoStore } from '@/stores/catalogo'
const store = useInventarioStore()
const catalogo = useCatalogoStore()
const { buffer } = storeToRefs(store)
const nuevo = reactive({ nombre: '', forma: 'rectangulo', color: '#93c5fd', ancho: 100, largo: 60, alto: 100, pesoMax: 100, ubicacion: 'suelo', gridFilas: 0, gridCols: 0 })

function startDrag(e, tipo) {
  e.dataTransfer.setData('tipo', tipo)
  e.dataTransfer.dropEffect = 'copy'
}

function downloadJSON() {
  const data = JSON.stringify(store.exportar(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'proyecto.json'
  a.click()
  URL.revokeObjectURL(url)
}

function onImport(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result)
      store.importar(json)
    } catch (err) {
      alert('JSON inválido')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function guardarSeleccionadoEnBuffer() {
  if (!store.elementoSeleccionado) return
  store.ponerEnBuffer(store.elementoSeleccionado.id)
}

function pegarBufferEnVista() {
  if (!buffer.value) return
  store.sacarDeBufferA(store.proyecto.vistaActual)
}

function crearPredefinido() {
  const grid = (nuevo.gridFilas > 0 && nuevo.gridCols > 0) ? { filas: Number(nuevo.gridFilas), columnas: Number(nuevo.gridCols) } : null
  catalogo.crearPersonalizado({
    nombre: nuevo.nombre,
    forma: nuevo.forma,
    color: nuevo.color,
    ancho: Number(nuevo.ancho),
    largo: Number(nuevo.largo),
    alto: Number(nuevo.alto),
    pesoMax: Number(nuevo.pesoMax),
    ubicacion: nuevo.ubicacion,
    grid,
  })
  nuevo.nombre = ''
}
</script>

<template>
  <div class="p-4 space-y-6 bg-white h-full">
    <div>
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Catálogo</h2>
      <div class="space-y-2">
        <div v-for="item in catalogo.items" :key="item.key"
             class="px-3 py-2 rounded-lg text-white cursor-move select-none transition-colors shadow-sm"
             :style="{ backgroundColor: item.color }"
             draggable="true"
             @dragstart="(e) => startDrag(e, item.key)"
             :title="'Arrastra: ' + item.nombre"
        >{{ item.nombre }}</div>
      </div>
    </div>

    <hr class="border-gray-200" />

    <div>
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Navegación</h2>
      <button
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg w-full transition-colors flex items-center justify-center"
        @click="store.volver()"
        title="Volver al nivel anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        Volver
      </button>
      <div class="text-xs text-gray-500 mt-2">
        Vista actual: <b class="font-medium">{{ store.proyecto.vistaActual }}</b>
      </div>
    </div>

    <hr class="border-gray-200" />

    <div>
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Buffer</h2>
      <div class="space-y-2">
        <button class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg w-full transition-colors"
                @click="guardarSeleccionadoEnBuffer"
                :disabled="!store.elementoSeleccionado"
        >Guardar seleccionado</button>
        <button class="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-lg w-full transition-colors"
                @click="pegarBufferEnVista"
                :disabled="!buffer"
        >Pegar en vista</button>
        <div class="text-xs text-gray-500">
          En buffer: <b>{{ buffer ? (buffer.custom?.nombre || buffer.tipo) + ' (' + buffer.id.substring(0, 6) + ')' : 'vacío' }}</b>
        </div>
        <div v-if="buffer && store.elementoActual?.custom?.grid" class="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          💡 Contenedor con grid: arrastra el elemento desde el buffer directamente a una celda
        </div>
      </div>
    </div>

    <hr class="border-gray-200" />

    <div>
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Proyecto</h2>
      <div class="space-y-2">
        <button
          class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg w-full transition-colors"
          @click="downloadJSON()"
        >Exportar JSON</button>

        <label class="block">
          <span class="text-sm font-medium text-gray-700">Importar JSON</span>
          <input type="file" accept="application/json" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mt-1"
                 @change="onImport" />
        </label>
      </div>
    </div>

    <hr class="border-gray-200" />

    <div>
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Nuevo predefinido</h2>
      <div class="space-y-2 text-sm">
        <input v-model="nuevo.nombre" type="text" placeholder="Nombre" class="w-full border rounded px-2 py-1" />
        <div class="grid grid-cols-2 gap-2">
          <label class="block">
            <span class="text-gray-600">Forma</span>
            <select v-model="nuevo.forma" class="w-full border rounded px-2 py-1">
              <option value="rectangulo">Rectángulo</option>
              <option value="circulo">Círculo</option>
            </select>
          </label>
          <label class="block">
            <span class="text-gray-600">Color</span>
            <input type="color" v-model="nuevo.color" class="w-full h-9 border rounded" />
          </label>
          <label class="block">
            <span class="text-gray-600">Ancho</span>
            <input type="number" v-model.number="nuevo.ancho" class="w-full border rounded px-2 py-1" />
          </label>
          <label class="block">
            <span class="text-gray-600">Largo</span>
            <input type="number" v-model.number="nuevo.largo" class="w-full border rounded px-2 py-1" />
          </label>
          <label class="block">
            <span class="text-gray-600">Alto</span>
            <input type="number" v-model.number="nuevo.alto" class="w-full border rounded px-2 py-1" />
          </label>
          <label class="block">
            <span class="text-gray-600">Peso máx.</span>
            <input type="number" v-model.number="nuevo.pesoMax" class="w-full border rounded px-2 py-1" />
          </label>
          <label class="block">
            <span class="text-gray-600">Ubicación</span>
            <select v-model="nuevo.ubicacion" class="w-full border rounded px-2 py-1">
              <option value="suelo">Suelo</option>
              <option value="pared">Pared</option>
            </select>
          </label>
          <div />
          <label class="block">
            <span class="text-gray-600">Grid filas</span>
            <input type="number" v-model.number="nuevo.gridFilas" class="w-full border rounded px-2 py-1" />
          </label>
          <label class="block">
            <span class="text-gray-600">Grid cols</span>
            <input type="number" v-model.number="nuevo.gridCols" class="w-full border rounded px-2 py-1" />
          </label>
        </div>
        <button class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded" @click="crearPredefinido">Crear</button>
      </div>
    </div>
  </div>
</template>
