import { defineConfig } from 'vite';
import { sugarize } from '@lotsof/sugarcss';

export default defineConfig({
  server: {
    port: 5184,
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: sugarize({
      minify: false,
    }),
  },
});
