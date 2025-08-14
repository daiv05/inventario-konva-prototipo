<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useInventarioStore } from '@/stores/inventario'
import { useCatalogoStore } from '@/stores/catalogo'

const store = useInventarioStore()
const catalogo = useCatalogoStore()

const width = ref(1000)
const height = ref(700)
const containerRef = ref(null)

const stageRef = ref(null)
const transformerRef = ref(null)
const isPanning = ref(false)
const collidingIds = ref(new Set())
const highlightedCell = ref(null)
const mostrarGrid = ref(true)

// Límites de zoom
const MIN_SCALE = 0.25
const MAX_SCALE = 4

const elementoActual = computed(() => store.elementoActual)
const vistaModo = computed(() => store.proyecto.vistaModo)
const pared = computed(() => store.proyecto.pared)
const elementoSeleccionado = computed(() => store.elementoSeleccionado)
const stage = computed(() => stageRef.value?.getNode())

// Pan con Space sostenido
function handleKeyDown(e) {
  if (e.code === 'Space') {
    isPanning.value = true
    const stage = stageRef.value.getNode()
    stage.draggable(true)
    document.body.style.cursor = 'grab'
  }
}
function handleKeyUp(e) {
  if (e.code === 'Space') {
    isPanning.value = false
    const stage = stageRef.value.getNode()
    stage.draggable(false)
    document.body.style.cursor = 'default'
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // Permitir drop externo (HTML5 DnD)
  const stage = stageRef.value.getNode()
  const container = stage.container()

  container.addEventListener('dragover', (e) => e.preventDefault())
  container.addEventListener('drop', (e) => {
    e.preventDefault()
    const tipo = e.dataTransfer.getData('tipo')
    if (!tipo) return

    // Obtener posición en coordenadas de Stage considerando scale/pos
    stage.setPointersPositions(e)
    const pointer = stage.getPointerPosition()

    const scale = stage.scaleX()
    let x = (pointer.x - stage.x()) / scale
    let y = (pointer.y - stage.y()) / scale

    const item = catalogo.getPorTipo(tipo)
    const ancho = item?.ancho ?? 200
    const largo = item?.largo ?? 80
    const altura = item?.alto ?? 200
    const color = item?.color ?? '#93c5fd'

    // Si hay grid, hacer snap a celda más cercana
    const grid = elementoActual.value?.custom?.grid
    if (grid && vistaModo.value === 'xy') {
      const parentAncho = elementoActual.value?.props?.ancho || width.value
      const parentLargo = elementoActual.value?.props?.largo || height.value
      const cellW = parentAncho / (grid.columnas || 1)
      const cellH = parentLargo / (grid.filas || 1)
      
      x = Math.max(0, Math.min(Math.round(x / cellW) * cellW, parentAncho - ancho))
      y = Math.max(0, Math.min(Math.round(y / cellH) * cellH, parentLargo - largo))
    }

    store.agregarElemento(store.proyecto.vistaActual, {
      id: (item?.key || tipo) + '-' + Math.random().toString(36).slice(2, 7),
      tipo: item?.key || tipo,
      props: { x, y, ancho, largo, altura, rotation: 0 },
      custom: { color, nombre: item?.nombre || tipo },
      hijos: []
    })
  })

  // Responsive canvas
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cr = entry.contentRect
      width.value = Math.max(300, cr.width)
      height.value = Math.max(300, cr.height)
    }
  })
  if (containerRef.value) {
    ro.observe(containerRef.value)
  }
  // Guardar para cleanup
  containerRef.value && (containerRef.value._ro = ro)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  if (containerRef.value && containerRef.value._ro) {
    containerRef.value._ro.disconnect()
  }
})

// Actualizar transformer cuando cambia la selección
watch(elementoSeleccionado, (el) => {
  const stage = stageRef.value.getNode()
  const tr = transformerRef.value.getNode()
  if (el) {
  const node = stage.findOne('#' + el.id)
    // En vistas laterales, desactivar transformer
    if (vistaModo.value === 'xy') {
      tr.nodes([node])
    } else {
      tr.nodes([])
    }
  } else {
    tr.nodes([])
  }
  tr.getLayer().batchDraw()
})

// Deseleccionar al hacer click en el fondo
function handleStageClick(e) {
  if (e.target === e.target.getStage()) {
    store.seleccionarElemento(null)
  }
}

// Zoom con wheel alrededor del puntero
function onWheel(e) {
  e.evt.preventDefault()
  const stage = e.target.getStage()
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()
  const scaleBy = 1.05
  let desired = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, desired))

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  stage.scale({ x: newScale, y: newScale })
  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  }
  stage.position(newPos)
  stage.batchDraw()
}

function handleTransformEnd(e) {
  const group = e.target
  const scaleX = group.scaleX()
  const scaleY = group.scaleY()

  // Buscar el rect principal dentro del grupo
  const rect = group.findOne('Rect')
  let newWidth = rect ? rect.width() * scaleX : 0
  let newHeight = rect ? rect.height() * scaleY : 0

  // reset scale del grupo para aplicar cambios en dimensiones reales
  group.scaleX(1)
  group.scaleY(1)

  // Actualizar dimensiones del rect para que reflejen el scale aplicado
  if (rect) {
    rect.width(Math.max(5, newWidth))
    rect.height(Math.max(5, newHeight))
  }

  // Snapping a grid si la vista actual tiene grid y es evento de drag
  let gx = group.x()
  let gy = group.y()
  const grid = elementoActual.value?.custom?.grid
  if (grid && vistaModo.value === 'xy' && e.type === 'dragend') {
    const parentAncho = elementoActual.value?.props?.ancho || width.value
    const parentLargo = elementoActual.value?.props?.largo || height.value
    const cellW = parentAncho / (grid.columnas || 1)
    const cellH = parentLargo / (grid.filas || 1)
    const rectW = Math.max(5, newWidth || (rect ? rect.width() : 0))
    const rectH = Math.max(5, newHeight || (rect ? rect.height() : 0))
    const snapX = Math.round(gx / cellW) * cellW
    const snapY = Math.round(gy / cellH) * cellH
    // Limitar dentro del contenedor
    gx = Math.max(0, Math.min(snapX, parentAncho - rectW))
    gy = Math.max(0, Math.min(snapY, parentLargo - rectH))
    group.position({ x: gx, y: gy })
  }

  // Persistir cambios en el store
  store.actualizarElemento(group.id(), {
    x: gx,
    y: gy,
    rotation: group.rotation(),
    ancho: Math.max(5, newWidth || 0),
    largo: Math.max(5, newHeight || 0),
  })
}

function groupConfig(el) {
  return {
    id: el.id,
    ...(vistaModo.value === 'xy'
      ? { x: el.props.x || 0, y: el.props.y || 0, rotation: el.props.rotation || 0 }
      : vistaModo.value === 'zx'
        ? { x: el.props.x || 0, y: Math.max(0, height.value - (el.props.altura || 0)), rotation: 0 }
        : { x: el.props.y || 0, y: Math.max(0, height.value - (el.props.altura || 0)), rotation: 0 }
    ),
    draggable: !isPanning.value,
    dragBoundFunc: (pos) => {
      if (vistaModo.value === 'xy') return pos
      // Bloquear eje vertical en vistas laterales
      return { x: pos.x, y: Math.max(0, height.value - (el.props.altura || 0)) }
    }
  }
}

function rectConfig(el) {
  return {
    x: 0,
    y: 0,
    width: vistaModo.value === 'xy' ? el.props.ancho : (vistaModo.value === 'zx' ? el.props.ancho : el.props.largo),
    height: vistaModo.value === 'xy' ? el.props.largo : (el.props.altura || 0),
    fill: el.custom.color || '#ddd',
    stroke: collidingIds.value.has(el.id) ? '#ef4444' : '#111',
    strokeWidth: 1,
    shadowForStrokeEnabled: false,
    perfectDrawEnabled: false,
    listening: true,
  }
}

function onDragMove(e, el) {
  // Detección de colisiones AABB simple entre hermanos
  const group = e.target
  const gx = group.x()
  const gy = group.y()
  const w = vistaModo.value === 'xy' ? el.props.ancho : (vistaModo.value === 'zx' ? el.props.ancho : el.props.largo)
  const h = vistaModo.value === 'xy' ? el.props.largo : (el.props.altura || 0)
  const id = el.id

  const siblings = (elementosVisibles.value || []).filter((hijo) => hijo.id !== id)

  let collide = false
  for (const s of siblings) {
    const sx = vistaModo.value === 'xy' ? (s.props.x || 0) : (vistaModo.value === 'zx' ? (s.props.x || 0) : (s.props.y || 0))
    const sy = vistaModo.value === 'xy' ? (s.props.y || 0) : Math.max(0, height.value - (s.props.altura || 0))
    const sw = vistaModo.value === 'xy' ? s.props.ancho : (vistaModo.value === 'zx' ? s.props.ancho : s.props.largo)
    const sh = vistaModo.value === 'xy' ? s.props.largo : (s.props.altura || 0)
    if (gx < sx + sw && gx + w > sx && gy < sy + sh && gy + h > sy) {
      collide = true
      break
    }
  }

  const set = new Set(collidingIds.value)
  if (collide) set.add(id); else set.delete(id)
  collidingIds.value = set
}

const elementosVisibles = computed(() => {
  const pl = elementoActual.value
  if (!pl) return []
  const hijos = pl.hijos || []
  if (vistaModo.value === 'xy') return hijos
  // Filtrar por pared en vistas laterales
  const umbral = 10
  const anchoPl = pl.props?.ancho || width.value
  const largoPl = pl.props?.largo || height.value
  if (vistaModo.value === 'zx') {
    if (pared.value === 'norte') {
      return hijos.filter(el => (el.props.y || 0) <= umbral)
    } else if (pared.value === 'sur') {
      return hijos.filter(el => ((el.props.y || 0) + (el.props.largo || 0)) >= (largoPl - umbral))
    } else if (pared.value === 'este') {
      // No corresponde a ZX; devolver vacío o mapear a zy, optamos por vacío
      return []
    } else {
      return []
    }
  } else { // zy
    if (pared.value === 'oeste') {
      return hijos.filter(el => (el.props.x || 0) <= umbral)
    } else if (pared.value === 'este') {
      return hijos.filter(el => ((el.props.x || 0) + (el.props.ancho || 0)) >= (anchoPl - umbral))
    } else {
      return []
    }
  }
})

// Funciones para indicadores de pared en vistas laterales
function getWallIndicators() {
  if (vistaModo.value === 'xy') return []
  
  const indicators = []
  
  if (vistaModo.value === 'zx') {
    // Vista lateral Norte/Sur - mostrar indicador de pared
    if (pared.value === 'norte') {
      indicators.push({
        position: 'bottom',
        name: 'Norte'
      })
    } else if (pared.value === 'sur') {
      indicators.push({
        position: 'bottom',
        name: 'Sur'
      })
    }
  } else if (vistaModo.value === 'zy') {
    // Vista lateral Este/Oeste - mostrar indicador de pared
    if (pared.value === 'oeste') {
      indicators.push({
        position: 'left',
        name: 'Oeste'
      })
    } else if (pared.value === 'este') {
      indicators.push({
        position: 'right',
        name: 'Este'
      })
    }
  }
  
  return indicators
}

const wallIndicators = computed(() => getWallIndicators())

// Sistema de grid mejorado
const gridCells = computed(() => {
  if (!elementoActual.value?.custom?.grid || !mostrarGrid.value) return []
  
  const grid = elementoActual.value.custom.grid
  const ancho = elementoActual.value.props.ancho
  const largo = elementoActual.value.props.largo
  const cellWidth = ancho / grid.cols
  const cellHeight = largo / grid.filas
  
  const cells = []
  for (let row = 0; row < grid.filas; row++) {
    for (let col = 0; col < grid.cols; col++) {
      cells.push({
        row: row + 1,
        col: col + 1,
        x: col * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
        destacada: highlightedCell.value?.fila === row + 1 && highlightedCell.value?.col === col + 1
      })
    }
  }
  return cells
})

const gridLines = computed(() => {
  if (!elementoActual.value?.custom?.grid || !mostrarGrid.value) return []
  
  const grid = elementoActual.value.custom.grid
  const ancho = elementoActual.value.props.ancho
  const largo = elementoActual.value.props.largo
  const lines = []
  
  // Líneas verticales
  for (let i = 0; i <= grid.cols; i++) {
    const x = (ancho / grid.cols) * i
    lines.push({
      points: [x, 0, x, largo]
    })
  }
  
  // Líneas horizontales
  for (let i = 0; i <= grid.filas; i++) {
    const y = (largo / grid.filas) * i
    lines.push({
      points: [0, y, ancho, y]
    })
  }
  
  return lines
})

function onGridCellClick(cell) {
  if (store.buffer) {
    store.sacarDeBufferA(store.proyecto.vistaActual, { fila: cell.row, col: cell.col })
  }
}

function onGridCellHover(cell, isEntering) {
  if (isEntering) {
    highlightedCell.value = { fila: cell.row, col: cell.col }
  } else {
    highlightedCell.value = null
  }
}
</script>

<template>
  <div class="h-full w-full relative bg-gray-100">
    <v-stage
      ref="stageRef"
      :config="{ width, height, draggable: false, scaleX: 1, scaleY: 1 }"
      @wheel="onWheel"
      @click="handleStageClick"
    >
      <v-layer>
        <!-- Fondo del nivel actual (planta etc.) -->
        <v-rect
          :config="{
            x: 0,
            y: 0,
            width: width,
            height: height,
            fill: '#f8f9fa',
            listening: true
          }"
        />
        <!-- Grid overlay mejorado -->
        <v-layer v-if="mostrarGrid && gridCells.length > 0">
          <!-- Líneas de grid con gradiente -->
          <v-line v-for="(line, i) in gridLines" :key="'grid-line-' + i"
            :config="{
              points: line.points,
              stroke: 'rgba(99, 102, 241, 0.2)',
              strokeWidth: 1,
              dash: [4, 4],
              listening: false
            }"
          />
          
          <!-- Celdas interactivas con efectos hover -->
          <v-rect v-for="cell in gridCells" :key="'grid-cell-' + cell.row + '-' + cell.col"
            :config="{
              x: cell.x,
              y: cell.y,
              width: cell.width,
              height: cell.height,
              fill: cell.destacada ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              stroke: cell.destacada ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.1)',
              strokeWidth: cell.destacada ? 2 : 1,
              listening: true,
              name: 'grid-cell'
            }"
            @click="onGridCellClick(cell)"
            @mouseenter="onGridCellHover(cell, true)"
            @mouseleave="onGridCellHover(cell, false)"
          />
          
          <!-- Labels de celdas con mejor tipografía -->
          <v-text v-for="cell in gridCells.filter(c => c.destacada)" :key="'grid-label-' + cell.row + '-' + cell.col"
            :config="{
              x: cell.x + 4,
              y: cell.y + 4,
              text: `${cell.row},${cell.col}`,
              fontSize: 10,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontStyle: '500',
              fill: 'rgba(99, 102, 241, 0.8)',
              listening: false
            }"
          />
        </v-layer>
  <!-- Render de hijos del elemento actual o proyección -->
          />
        
        <!-- Indicadores de pared para vistas laterales -->
        <template v-for="indicator in wallIndicators" :key="indicator.label">
          <v-rect :config="indicator.rect" />
          <v-text :config="{
            x: indicator.rect.x + 10,
            y: indicator.rect.y + indicator.rect.height/2 - 6,
            text: indicator.label,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fill: '#6b7280',
            listening: false
          }" />
        </template>
        
        <!-- Highlight de celda en grid -->
        <template v-if="vistaModo === 'xy' && elementoActual?.custom?.grid && highlightedCell">
          <v-rect :config="{
            x: (elementoActual.props.ancho/elementoActual.custom.grid.columnas) * (highlightedCell.col-1),
            y: (elementoActual.props.largo/elementoActual.custom.grid.filas) * (highlightedCell.fila-1),
            width: elementoActual.props.ancho/elementoActual.custom.grid.columnas,
            height: elementoActual.props.largo/elementoActual.custom.grid.filas,
            fill: '#3b82f6',
            opacity: 0.2,
            listening: false
          }" />
        </template>
        
  <!-- Render de hijos del elemento actual o proyección -->
  <template v-for="(el) in elementosVisibles" :key="el.id">
          <v-group
            :config="groupConfig(el)"
      @dragmove="(e) => onDragMove(e, el)"
      @dragend="handleTransformEnd"
            @transformend="handleTransformEnd"
            @click="store.seleccionarElemento(el.id)"
            @dblclick="store.setVista(el.id)"
          >
            <v-rect :config="rectConfig(el)" />
            <v-text
              :config="{
    x: 8,
                y: 6,
    text: el.custom?.nombre || (el.tipo + ' (' + el.id.substring(0, 4) + ')'),
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                fill: '#333',
                listening: false
              }"
            />
          </v-group>
        </template>
  <v-transformer 
          ref="transformerRef"
          :config="{
            borderStroke: '#007bff',
            anchorStroke: '#007bff',
            anchorFill: '#fff',
            anchorSize: 8,
            rotationSnaps: [0, 90, 180, 270],
            resizeEnabled: true,
          }"
        />
      </v-layer>
    </v-stage>

    <!-- Controles de canvas mejorados -->
    <div class="absolute top-4 left-4 z-10 flex flex-col gap-3">
      <!-- Grid toggle con diseño moderno -->
      <div class="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-lg p-3">
        <label class="flex items-center gap-3 cursor-pointer">
          <div class="relative">
            <input 
              type="checkbox" 
              v-model="mostrarGrid" 
              class="sr-only" 
            />
            <div class="w-11 h-6 bg-slate-200 rounded-full shadow-inner transition-colors duration-200"
                 :class="mostrarGrid ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-slate-200'">
            </div>
            <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200"
                 :class="mostrarGrid ? 'transform translate-x-5' : ''">
            </div>
          </div>
          <span class="text-sm font-medium text-slate-700 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
            Grid
          </span>
        </label>
      </div>

      <!-- Información del zoom -->
      <div class="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-lg px-4 py-2">
        <div class="flex items-center gap-2 text-xs text-slate-600">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          Zoom: {{ Math.round((stage?.scaleX() || 1) * 100) }}%
        </div>
      </div>

      <!-- Vista actual indicator -->
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg px-4 py-2 text-white">
        <div class="flex items-center gap-2 text-xs font-medium">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          {{ store.proyecto.vistaActual }}
        </div>
      </div>
    </div>

    <!-- Indicadores de pared con diseño mejorado -->
    <div v-if="wallIndicators.length > 0" class="absolute inset-4 pointer-events-none z-10">
      <div v-for="wall in wallIndicators" :key="wall.position" 
           class="absolute bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-white/20"
           :style="{ 
             [wall.position]: '16px',
             ...(wall.position === 'top' || wall.position === 'bottom' ? { left: '50%', transform: 'translateX(-50%)' } : {}),
             ...(wall.position === 'left' || wall.position === 'right' ? { top: '50%', transform: 'translateY(-50%)' } : {})
           }">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-white rounded-full"></div>
          Pared {{ wall.name }}
        </div>
      </div>
    </div>

    <!-- Tips mejorados -->
    <div class="absolute bottom-4 left-4 z-10">
      <div class="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-lg p-4 max-w-md">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="space-y-1 text-xs text-slate-600">
            <div class="font-semibold text-slate-800 mb-2">Controles</div>
            <div class="flex items-center gap-2">
              <kbd class="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-xs">Rueda</kbd>
              <span>Zoom</span>
            </div>
            <div class="flex items-center gap-2">
              <kbd class="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-xs">Space</kbd>
              <span>+ Arrastrar = Pan</span>
            </div>
            <div class="flex items-center gap-2">
              <kbd class="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-mono text-xs">Doble click</kbd>
              <span>Entrar elemento</span>
            </div>
            
            <div v-if="vistaModo !== 'xy'" class="mt-3 pt-2 border-t border-slate-200">
              <div class="flex items-center gap-2 text-indigo-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="font-medium">Vista {{ vistaModo.toUpperCase() }}</span>
              </div>
              <div class="text-slate-500">Pared {{ pared }} • {{ elementosVisibles.length }} elementos</div>
            </div>
            
            <div v-if="elementoActual?.custom?.grid" class="mt-3 pt-2 border-t border-slate-200">
              <div class="flex items-center gap-2 text-emerald-600">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"/>
                </svg>
                <span class="font-medium">Grid {{ elementoActual.custom.grid.filas }}×{{ elementoActual.custom.grid.columnas }}</span>
              </div>
              <div class="text-slate-500">Click en celda para pegar buffer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
