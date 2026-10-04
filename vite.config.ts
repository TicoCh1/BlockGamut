import {defineConfig} from 'vite';
import {glassGeometryPlugin} from './scripts/glass-geometry.mjs';
export default defineConfig({base:'./',plugins:[glassGeometryPlugin()],server:{watch:{ignored:['**/artifacts/**','**/.npm-cache/**','**/portable/**','**/docs/**','**/dist/**']}},optimizeDeps:{exclude:['@form-glass/react'],include:['react','react-dom','react-dom/client','react/jsx-runtime']},build:{rollupOptions:{output:{manualChunks:{three:['three'],glass:['@form-glass/react']}}}}});
