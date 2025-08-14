import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './index.css'
import VueKonva from 'vue-konva';
import { useInventarioStore } from '@/stores/inventario'
import { useCatalogoStore } from '@/stores/catalogo'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(VueKonva);

// Hidratar proyecto desde localStorage si existe
try {
	const store = useInventarioStore()
	if (store && store._loadPersisted) store._loadPersisted()
	// Inicializar catálogo (side-effect de crear instancia)
	const cat = useCatalogoStore()
	if (cat && cat._load) cat._load()
} catch (_) { /* noop */ }
app.mount('#app')
