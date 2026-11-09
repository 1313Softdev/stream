import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const currentDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

function copyStaticPublicPlugin(): Plugin {
  return {
    name: 'copy-static-public-without-uploads',
    closeBundle() {
      const publicDir = path.resolve(currentDir, 'public');
      const distDir = path.resolve(currentDir, 'dist');
      if (!fs.existsSync(publicDir) || !fs.existsSync(distDir)) return;

      const entries = fs.readdirSync(publicDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'uploads') continue; // Never duplicate uploaded videos into dist
        const srcPath = path.join(publicDir, entry.name);
        const destPath = path.join(distDir, entry.name);
        fs.cpSync(srcPath, destPath, { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), copyStaticPublicPlugin()],
    build: {
      copyPublicDir: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
