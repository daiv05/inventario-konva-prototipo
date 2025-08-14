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
  <div class="h-full flex flex-col">
    <!-- Header del sidebar -->
    <div class="p-6 border-b border-slate-200/50">
      <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
        <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a1 1 0 011-1h1m-1 1v1h1m-1-1h1"/>
          </svg>
        </div>
        Catálogo
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Catálogo con cards mejoradas -->
      <div class="p-4">
        <div class="grid gap-3">
          <div v-for="item in catalogo.items" :key="item.key"
               class="group relative p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all duration-200 cursor-move select-none bg-gradient-to-br hover:shadow-lg"
               :style="{ 
                 background: `linear-gradient(135deg, ${item.color}15, ${item.color}05)`,
                 borderColor: item.color + '40'
               }"
               draggable="true"
               @dragstart="(e) => startDrag(e, item.key)"
               :title="'Arrastra: ' + item.nombre"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                   :style="{ backgroundColor: item.color }">
                {{ item.forma === 'circulo' ? '●' : '■' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-slate-800 truncate">{{ item.nombre }}</div>
                <div class="text-xs text-slate-500">{{ item.ancho }}×{{ item.largo }}×{{ item.alto }}</div>
              </div>
              <div class="text-xs text-slate-400 font-mono">
                {{ item.ubicacion === 'suelo' ? '⬇️' : '📍' }}
              </div>
            </div>
            <div class="absolute inset-0 bg-gradient-to-br from-transparent to-slate-900/5 rounded-xl pointer-events-none group-hover:from-white/10"></div>
          </div>
        </div>
      </div>

      <!-- Navegación con diseño mejorado -->
      <div class="p-4 border-t border-slate-200/50">
        <h3 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          Navegación
        </h3>
        <button
          class="w-full bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 font-medium px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300"
          @click="store.volver()"
          title="Volver al nivel anterior"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
          </svg>
          Volver
        </button>
        <div class="text-xs text-slate-500 mt-2 px-2">
          Vista actual: <span class="font-medium text-slate-700">{{ store.proyecto.vistaActual }}</span>
        </div>
      </div>

      <!-- Buffer con indicadores visuales -->
      <div class="p-4 border-t border-slate-200/50">
        <h3 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H14"/>
          </svg>
          Buffer de elementos
        </h3>
        <div class="space-y-2">
          <button 
            class="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            @click="guardarSeleccionadoEnBuffer"
            :disabled="!store.elementoSeleccionado"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8"/>
            </svg>
            Guardar seleccionado
          </button>
          <button 
            class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            @click="pegarBufferEnVista"
            :disabled="!buffer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Pegar en vista
          </button>
          
          <!-- Estado del buffer -->
          <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div class="text-xs text-slate-500 mb-1">En buffer:</div>
            <div class="text-sm font-medium text-slate-700">
              {{ buffer ? (buffer.custom?.nombre || buffer.tipo) + ' (' + buffer.id.substring(0, 6) + ')' : 'vacío' }}
            </div>
          </div>
          
          <div v-if="buffer && store.elementoActual?.custom?.grid" class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="text-xs text-blue-700">
                <div class="font-medium">Contenedor con grid detectado</div>
                <div class="mt-1">Arrastra el elemento desde el buffer directamente a una celda</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Proyecto con iconos mejorados -->
      <div class="p-4 border-t border-slate-200/50">
        <h3 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a1 1 0 011-1h1m-1 1v1h1m-1-1h1"/>
          </svg>
          Proyecto
        </h3>
        <div class="space-y-2">
          <button
            class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            @click="downloadJSON()"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Exportar JSON
          </button>

          <label class="block">
            <span class="text-sm font-medium text-slate-700 mb-2 block">Importar proyecto</span>
            <input type="file" accept="application/json" 
                   class="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-blue-50 file:to-indigo-50 file:text-indigo-700 hover:file:from-blue-100 hover:file:to-indigo-100 file:transition-all file:duration-200 border border-slate-200 rounded-lg"
                   @change="onImport" />
          </label>
        </div>
      </div>

      <!-- Editor de predefinidos con diseño card -->
      <div class="p-4 border-t border-slate-200/50">
        <h3 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Nuevo elemento
        </h3>
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div class="space-y-3">
            <input 
              v-model="nuevo.nombre" 
              type="text" 
              placeholder="Nombre del elemento" 
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
            />
            
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Forma</label>
                <select v-model="nuevo.forma" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="rectangulo">Rectángulo</option>
                  <option value="circulo">Círculo</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Color</label>
                <input type="color" v-model="nuevo.color" class="w-full h-9 border border-slate-300 rounded-lg cursor-pointer" />
              </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Ancho</label>
                <input type="number" v-model.number="nuevo.ancho" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Largo</label>
                <input type="number" v-model.number="nuevo.largo" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Alto</label>
                <input type="number" v-model.number="nuevo.alto" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Peso máx.</label>
                <input type="number" v-model.number="nuevo.pesoMax" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Ubicación</label>
                <select v-model="nuevo.ubicacion" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="suelo">Suelo</option>
                  <option value="pared">Pared</option>
                </select>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Grid filas</label>
                <input type="number" v-model.number="nuevo.gridFilas" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Grid cols</label>
                <input type="number" v-model.number="nuevo.gridCols" class="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <button 
              @click="crearPredefinido"
              class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Crear elemento
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
