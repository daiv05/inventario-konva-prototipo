import { defineStore } from 'pinia'

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function generarId(base) {
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}

export const useInventarioStore = defineStore('inventario', {
  state: () => ({
    proyecto: {
      nombre: "Distribución Planta 1",
      escala: 0.25, // factor: unidades a px
      vistaActual: 'root',
  vistaModo: 'xy', // xy | zx | zy
  pared: 'norte', // norte | sur | este | oeste
      historial: [],
      elementos: [
        {
          id: 'root',
          tipo: 'planta',
          props: { x: 0, y: 0, ancho: 2000, largo: 1500, unidad: 'cm', altura: 300 },
          custom: { color: '#f3f4f6' },
          hijos: []
        }
      ]
    },
    elementoSeleccionadoId: null,
    buffer: null,
    // Undo/Redo
    _history: [],
  _redo: [],
  _historyLimit: 100
  }),
  getters: {
    elementoActual(state) {
      return this.buscarElemento(state.proyecto.vistaActual)
    },
    elementoSeleccionado(state) {
      if (!state.elementoSeleccionadoId) return null
      return this.buscarElemento(state.elementoSeleccionadoId)
    },
    root(state) {
      return this.buscarElemento('root')
    },
    plantas() {
      const r = this.root
      if (!r) return []
      if (r.tipo === 'planta') return [r]
      return (r.hijos || []).filter(e => e.tipo === 'planta')
    }
  },
  actions: {
    _persist() {
      try {
        localStorage.setItem('inventario.proyecto', JSON.stringify(this.proyecto))
      } catch (_) { /* noop */ }
    },
    _loadPersisted() {
      try {
        const raw = localStorage.getItem('inventario.proyecto')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.elementos && Array.isArray(parsed.elementos)) {
            this.proyecto = parsed
          }
        }
      } catch (_) { /* noop */ }
    },
    snapshot() {
      // push current state into history for undo
      this._history.push(deepClone(this.proyecto))
      if (this._history.length > this._historyLimit) {
        this._history.shift()
      }
      // clear redo on new action
      this._redo = []
      this._persist()
    },
    undo() {
      if (!this._history.length) return
      const last = this._history.pop()
      this._redo.push(deepClone(this.proyecto))
      this.proyecto = last
      this._persist()
    },
    redo() {
      if (!this._redo.length) return
      const next = this._redo.pop()
      this._history.push(deepClone(this.proyecto))
      this.proyecto = next
      this._persist()
    },
    buscarElemento(id, lista) {
      lista = lista || this.proyecto.elementos
      for (const el of lista) {
        if (el.id === id) return el
        const found = this.buscarElemento(id, el.hijos)
        if (found) return found
      }
      return null
    },
    seleccionarElemento(id) {
      this.elementoSeleccionadoId = id
    },
    agregarElemento(padreId, elemento) {
      const padre = this.buscarElemento(padreId)
      if (!padre) return
      this.snapshot()
      padre.hijos.push(elemento)
    },
    eliminarElemento(id) {
      if (!id) return
      this.snapshot()
      const parent = this.buscarPadre(id)
      if (parent) {
        const index = parent.hijos.findIndex(h => h.id === id)
        if (index !== -1) {
          parent.hijos.splice(index, 1)
          if (this.elementoSeleccionadoId === id) {
            this.elementoSeleccionadoId = null
          }
        }
      }
    },
    actualizarElemento(id, props, custom) {
      const el = this.buscarElemento(id)
      if (!el) return
      this.snapshot()
      if (props) {
        Object.assign(el.props, props)
      }
      if (custom) {
        Object.assign(el.custom, custom)
      }
    },
    buscarPadre(id, lista, padre = null) {
      lista = lista || this.proyecto.elementos
      for (const el of lista) {
        if (el.id === id) return padre
        const found = this.buscarPadre(id, el.hijos, el)
        if (found) return found
      }
      return null
    },
    setVista(id) {
      this.snapshot()
      this.elementoSeleccionadoId = null
      this.proyecto.historial.push(this.proyecto.vistaActual)
      this.proyecto.vistaActual = id
    },
    setVistaModo(modo) {
      if (!['xy','zx','zy'].includes(modo)) return
      this.snapshot()
      this.proyecto.vistaModo = modo
    },
    setPared(p) {
      if (!['norte','sur','este','oeste'].includes(p)) return
      this.snapshot()
      this.proyecto.pared = p
    },
    volver() {
      if (this.proyecto.historial.length) {
        this.snapshot()
        this.elementoSeleccionadoId = null
        this.proyecto.vistaActual = this.proyecto.historial.pop()
      }
    },
    importar(json) {
      // Validación mínima
      if (!json || !Array.isArray(json.elementos) || typeof json.vistaActual !== 'string') {
        return
      }
      this.snapshot()
      this.proyecto = json
      this._persist()
    },
    exportar() {
      return deepClone(this.proyecto)
    },
    // Buffer para reparenting
    ponerEnBuffer(id) {
      const parent = this.buscarPadre(id)
      if (!parent) return
      const idx = parent.hijos.findIndex(h => h.id === id)
      if (idx === -1) return
      this.snapshot()
      const [el] = parent.hijos.splice(idx, 1)
      this.buffer = el
      if (this.elementoSeleccionadoId === id) this.elementoSeleccionadoId = null
    },
    sacarDeBufferA(nuevoPadreId, celda = null) {
      if (!this.buffer) return
      const padre = this.buscarElemento(nuevoPadreId)
      if (!padre) return
      this.snapshot()
      
      // Si hay celda específica y el padre tiene grid, posicionar en esa celda
      if (celda && padre.custom?.grid) {
        const grid = padre.custom.grid
        const cellW = (padre.props.ancho || 0) / (grid.columnas || 1)
        const cellH = (padre.props.largo || 0) / (grid.filas || 1)
        const x = cellW * (celda.col - 1)
        const y = cellH * (celda.fila - 1)
        
        // Actualizar posición del elemento del buffer
        this.buffer.props = this.buffer.props || {}
        this.buffer.props.x = x
        this.buffer.props.y = y
        
        // Ajustar tamaño si es necesario para que quepa en la celda
        if (this.buffer.props.ancho > cellW) this.buffer.props.ancho = cellW
        if (this.buffer.props.largo > cellH) this.buffer.props.largo = cellH
      }
      
      padre.hijos.push(this.buffer)
      this.buffer = null
    },
    // Gestión de plantas
    convertirRootAEdificio() {
      const r = this.root
      if (!r || r.tipo !== 'planta') return
      this.snapshot()
      const antigua = deepClone(r)
      // Convertir root en edificio
      r.tipo = 'edificio'
      r.custom = r.custom || {}
      r.custom.nombre = r.custom?.nombre || 'Edificio'
      // Nueva planta con contenido anterior
      const nuevaId = generarId('planta')
      const nueva = {
        id: nuevaId,
        tipo: 'planta',
        props: antigua.props,
        custom: { ...(antigua.custom || {}), nombre: 'Planta 1' },
        hijos: antigua.hijos || []
      }
      r.hijos = [nueva]
      // Actualizar vista si era root
      if (this.proyecto.vistaActual === 'root') this.proyecto.vistaActual = nuevaId
    },
    crearPlanta({ nombre }) {
      const r = this.root
      if (!r) return
      if (r.tipo === 'planta') this.convertirRootAEdificio()
      const rr = this.root
      this.snapshot()
      const id = generarId('planta')
      rr.hijos.push({
        id,
        tipo: 'planta',
        props: { x: 0, y: 0, ancho: 2000, largo: 1500, unidad: 'cm', altura: 300 },
        custom: { color: '#f3f4f6', nombre: nombre || id },
        hijos: []
      })
    },
    renombrarPlanta(id, nombre) {
      const pl = this.buscarElemento(id)
      if (!pl || pl.tipo !== 'planta') return
      this.snapshot()
      pl.custom = pl.custom || {}
      pl.custom.nombre = nombre
    },
    eliminarPlanta(id) {
      const pl = this.buscarElemento(id)
      if (!pl || pl.tipo !== 'planta') return
      if (pl.hijos && pl.hijos.length) return
      const parent = this.buscarPadre(id)
      if (!parent) return
      this.snapshot()
      const idx = parent.hijos.findIndex(h => h.id === id)
      if (idx !== -1) parent.hijos.splice(idx, 1)
      if (this.proyecto.vistaActual === id) this.proyecto.vistaActual = parent.id || 'root'
    },
    seleccionarPlanta(id) {
      const pl = this.buscarElemento(id)
      if (!pl || pl.tipo !== 'planta') return
      this.setVista(id)
    },
  }
})
