import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'FlatLayout',
      fileName: 'index'
    },
    rollupOptions: {
      // 核心原则：既然是包，就不应该把 Vue 框架也打进去
      external: ['vue', '@telltell/core'],
      output: {
        globals: {
          vue: 'Vue',
          '@telltell/core': 'TellTellCore'
        }
      }
    }
  }
});
