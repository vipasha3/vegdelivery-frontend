import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // આ ખાતરી કરશે કે સર્વર પર પ્રોપર બિલ્ડ થાય
      output: {
        manualChunks: undefined,
      },
    },
  },
})