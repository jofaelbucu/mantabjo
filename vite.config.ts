// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import path from 'path'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   base: process.env.NODE_ENV === 'production' ? '/MantabJo/' : '/',
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'),
//     },
//   },
// })

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // ⬅️ Tambahkan ini

export default defineConfig({
  base: '/mantabjo/', // ⬅️ sesuai nama repo GitHub
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ⬅️ Definisi alias "@"
    },
  },
});