import { defineStore } from 'pinia'

function idBase(str) {
  return str.toLowerCase().replace(/\s+/g, '-')
}

export const useCatalogoStore = defineStore('catalogo', {
  state: () => ({
    items: [
      {
        key: 'anaquel-3-pisos',
        nombre: 'Anaquel 3 pisos',
        forma: 'rectangulo',
        color: '#93c5fd',
        ancho: 200,
        largo: 80,
        alto: 200,
        pesoMax: 500,
        ubicacion: 'suelo',
      },
      {
        key: 'estantes-2-pisos',
        nombre: 'Estantes 2 pisos',
        forma: 'rectangulo',
        color: '#60a5fa',
        ancho: 160,
        largo: 60,
        alto: 180,
        pesoMax: 300,
        ubicacion: 'pared',
      },
      {
        key: 'barril',
        nombre: 'Barril',
        forma: 'circulo',
        color: '#f59e0b',
        ancho: 60,
        largo: 60,
        alto: 90,
        pesoMax: 80,
        ubicacion: 'suelo',
      },
      {
        key: 'pila-barriles-3',
        nombre: 'Pila de barriles (3)',
        forma: 'rectangulo',
        color: '#fbbf24',
        ancho: 180,
        largo: 60,
        alto: 180,
        pesoMax: 240,
        ubicacion: 'suelo',
      },
      {
        key: 'contenedor-grid',
        nombre: 'Contenedor (grid)',
        forma: 'rectangulo',
        color: '#a3e635',
        ancho: 240,
        largo: 120,
        alto: 200,
        pesoMax: 1000,
        ubicacion: 'suelo',
        grid: { filas: 2, columnas: 3 },
      },
    ],
  }),
  getters: {
    getPorTipo: (state) => (tipo) => state.items.find((i) => i.key === tipo) || null,
  },
  actions: {
    _persist() {
      try { localStorage.setItem('catalogo.items', JSON.stringify(this.items)) } catch (_) {}
    },
    _load() {
      try {
        const raw = localStorage.getItem('catalogo.items')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.items = arr
        }
      } catch (_) {}
    },
    crearPersonalizado(datos) {
      const nombre = datos?.nombre?.trim() || 'custom'
      const key = (datos?.key?.trim()) || idBase(nombre)
      const item = {
        key,
        nombre,
        forma: datos.forma || 'rectangulo',
        color: datos.color || '#93c5fd',
        ancho: +datos.ancho || 100,
        largo: +datos.largo || 60,
        alto: +datos.alto || 100,
        pesoMax: +datos.pesoMax || 100,
        ubicacion: datos.ubicacion || 'suelo',
        grid: datos.grid || null,
      }
      this.items.push(item)
  this._persist()
      return item
    },
  },
})
