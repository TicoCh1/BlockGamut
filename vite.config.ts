import {defineConfig} from 'vite';
import {glassGeometryPlugin} from './scripts/glass-geometry.mjs';
export default defineConfig({base:'./',plugins:[glassGeometryPlugin()],optimizeDeps:{exclude:['@form-glass/react']},build:{rollupOptions:{output:{manualChunks:{three:['three'],glass:['@form-glass/react']}}}}});
