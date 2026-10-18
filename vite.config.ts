import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// Built-in zero-dependency plugin to generate Brotli (.br) and Gzip (.gz) precompressed assets
function precompressPlugin(): Plugin {
  return {
    name: 'vite-plugin-precompress',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      const compressFile = (filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        if (!['.js', '.css', '.html', '.svg', '.json'].includes(ext)) return;
        
        try {
          const content = fs.readFileSync(filePath);
          if (content.length < 256) return; // skip negligible files

          // Gzip (level 9 - maximum compression)
          const gzipped = zlib.gzipSync(content, { level: 9 });
          fs.writeFileSync(`${filePath}.gz`, gzipped);

          // Brotli (quality 11 - highest compression for modern browsers)
          const brotlied = zlib.brotliCompressSync(content, {
            params: {
              [zlib.constants.BROTLI_PARAM_MODE]: ext === '.html' ? zlib.constants.BROTLI_MODE_TEXT : zlib.constants.BROTLI_MODE_GENERIC,
              [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
            }
          });
          fs.writeFileSync(`${filePath}.br`, brotlied);
        } catch (e) {
          console.warn(`[Precompress] Skipped ${filePath}:`, e);
        }
      };

      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile() && !entry.name.endsWith('.gz') && !entry.name.endsWith('.br')) {
            compressFile(fullPath);
          }
        }
      };

      walk(distDir);
      console.log('⚡ [Precompress] High-efficiency .gz and .br assets generated');
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), precompressPlugin()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (/[\\/]node_modules[\\/](recharts|d3-|victory|decimal\.js-light)[\\/]/.test(id)) {
            return 'vendor-charts';
          }
          if (/[\\/]node_modules[\\/](@radix-ui|cmdk|vaul|input-otp|embla-carousel-react)[\\/]/.test(id)) {
            return 'vendor-ui';
          }
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
            return 'vendor-icons';
          }
          if (/[\\/]node_modules[\\/](date-fns|react-day-picker)[\\/]/.test(id)) {
            return 'vendor-date';
          }
          if (/[\\/]node_modules[\\/](motion|lenis)[\\/]/.test(id)) {
            return 'vendor-motion';
          }
        }
      }
    }
  },
  server: {
    host: true, // Listen on all local IP addresses
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
