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

// Límites de zoom
const MIN_SCALE = 0.25
const MAX_SCALE = 4

const elementoActual = computed(() => store.elementoActual)
const vistaModo = computed(() => store.proyecto.vistaModo)
const pared = computed(() => store.proyecto.pared)
const elementoSeleccionado = computed(() => store.elementoSeleccionado)

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

function highlightCell(fila, col) {
  highlightedCell.value = { fila, col }
}

function unhighlightCell() {
  highlightedCell.value = null
}

function selectCell(fila, col) {
  // Si hay elemento en buffer, pegarlo en esta celda
  if (store.buffer) {
    store.sacarDeBufferA(store.proyecto.vistaActual, { fila, col })
  } else {
    console.log(`Celda seleccionada: ${fila}, ${col}`)
  }
}

// Funciones para indicadores de pared en vistas laterales
function getWallIndicators() {
  if (vistaModo.value === 'xy') return []
  
  const indicators = []
  const pl = elementoActual.value
  if (!pl) return indicators
  
  const w = width.value
  const h = height.value
  const wallHeight = 50 // Altura visual de la pared
  
  if (vistaModo.value === 'zx') {
    // Vista lateral Norte/Sur - mostrar pared norte y sur
    if (pared.value === 'norte') {
      indicators.push({
        type: 'wall',
        label: 'Pared Norte',
        rect: { x: 0, y: h - wallHeight, width: w, height: wallHeight, fill: '#f3f4f6', stroke: '#9ca3af' }
      })
    } else if (pared.value === 'sur') {
      indicators.push({
        type: 'wall',
        label: 'Pared Sur',
        rect: { x: 0, y: h - wallHeight, width: w, height: wallHeight, fill: '#f3f4f6', stroke: '#9ca3af' }
      })
    }
  } else if (vistaModo.value === 'zy') {
    // Vista lateral Este/Oeste - mostrar pared este u oeste
    if (pared.value === 'oeste') {
      indicators.push({
        type: 'wall',
        label: 'Pared Oeste',
        rect: { x: 0, y: h - wallHeight, width: w, height: wallHeight, fill: '#f3f4f6', stroke: '#9ca3af' }
      })
    } else if (pared.value === 'este') {
      indicators.push({
        type: 'wall',
        label: 'Pared Este',
        rect: { x: 0, y: h - wallHeight, width: w, height: wallHeight, fill: '#f3f4f6', stroke: '#9ca3af' }
      })
    }
  }
  
  return indicators
}

const wallIndicators = computed(() => getWallIndicators())
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
        <!-- Grid overlay si el elemento actual tiene grid (vista contenedor) -->
        <template v-if="vistaModo === 'xy' && elementoActual?.custom?.grid">
          <template v-for="i in elementoActual.custom.grid.columnas + 1" :key="'v'+i">
            <v-line :config="{
              points: [ (elementoActual.props.ancho/elementoActual.custom.grid.columnas) * (i-1), 0, (elementoActual.props.ancho/elementoActual.custom.grid.columnas) * (i-1), elementoActual.props.largo ],
              stroke: '#d1d5db',
              strokeWidth: i === 1 || i === elementoActual.custom.grid.columnas + 1 ? 2 : 1,
              listening: false
            }" />
          </template>
          <template v-for="j in elementoActual.custom.grid.filas + 1" :key="'h'+j">
            <v-line :config="{
              points: [ 0, (elementoActual.props.largo/elementoActual.custom.grid.filas) * (j-1), elementoActual.props.ancho, (elementoActual.props.largo/elementoActual.custom.grid.filas) * (j-1) ],
              stroke: '#d1d5db',
              strokeWidth: j === 1 || j === elementoActual.custom.grid.filas + 1 ? 2 : 1,
              listening: false
            }" />
          </template>
          <!-- Celdas con highlighting al hover -->
          <template v-for="fila in elementoActual.custom.grid.filas" :key="'cell-row-'+fila">
            <template v-for="col in elementoActual.custom.grid.columnas" :key="'cell-'+fila+'-'+col">
              <v-rect 
                :config="{
                  x: (elementoActual.props.ancho/elementoActual.custom.grid.columnas) * (col-1),
                  y: (elementoActual.props.largo/elementoActual.custom.grid.filas) * (fila-1),
                  width: elementoActual.props.ancho/elementoActual.custom.grid.columnas,
                  height: elementoActual.props.largo/elementoActual.custom.grid.filas,
                  fill: 'transparent',
                  listening: true
                }"
                @mouseenter="highlightCell(fila, col)"
                @mouseleave="unhighlightCell()"
                @click="selectCell(fila, col)"
              />
            </template>
          </template>
        </template>
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

  <div class="absolute top-2 left-2 bg-white/90 rounded-lg px-3 py-2 text-xs shadow-md text-gray-700" ref="containerRef">
      <div><b>Tips:</b> <kbd>Rueda</kbd> = Zoom, <kbd>Space</kbd> + Arrastrar = Pan, <kbd>Doble click</kbd> = Entrar</div>
    </div>
    <div class="absolute top-2 left-2 bg-white/90 rounded-lg px-3 py-2 text-xs shadow-md text-gray-700" ref="containerRef">
      <div><b>Tips:</b> <kbd>Rueda</kbd> = Zoom, <kbd>Space</kbd> + Arrastrar = Pan, <kbd>Doble click</kbd> = Entrar</div>
      <div v-if="vistaModo !== 'xy'" class="mt-1 text-blue-600">
        <b>Vista {{ vistaModo.toUpperCase() }}:</b> Pared {{ pared }} • {{ elementosVisibles.length }} elementos cercanos
      </div>
      <div v-if="elementoActual?.custom?.grid" class="mt-1 text-green-600">
        <b>Grid:</b> {{ elementoActual.custom.grid.filas }}×{{ elementoActual.custom.grid.columnas }} • Click en celda para pegar buffer
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
