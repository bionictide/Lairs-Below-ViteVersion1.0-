// WARNING: Do not add Phaser or game config here. This file is for Vite build config only.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
