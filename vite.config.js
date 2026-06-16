import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri가 로컬 파일을 로드할 수 있도록 기본 설정 지원
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri는 macOS/Windows에서 Chromium을 기반으로 하므로 최신 빌드 타겟 지정
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // 디버그 빌드 시 minification 비활성화하여 트래킹 용이하게 설정 가능
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
