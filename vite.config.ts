import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Injects the list of built asset URLs into the service worker's
 * precache manifest placeholder so the whole app is cached at
 * install time and works offline immediately.
 */
function swPrecache(): Plugin {
  return {
    name: 'felt-notes-sw-precache',
    apply: 'build',
    closeBundle() {
      const dist = join(projectRoot, 'dist');
      const urls: string[] = ['./'];
      const walk = (dir: string, prefix: string) => {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          if (statSync(full).isDirectory()) {
            walk(full, `${prefix}${entry}/`);
          } else if (entry !== 'sw.js') {
            urls.push(`${prefix}${entry}`);
          }
        }
      };
      walk(dist, '');
      const swPath = join(dist, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      writeFileSync(
        swPath,
        sw.replace('self.__PRECACHE_MANIFEST__', JSON.stringify(urls)),
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), swPrecache()],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
