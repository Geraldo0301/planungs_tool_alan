import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/t
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(), //Tailwind CSS v4 Vite integration
    ],
    server: {
        port: 5713,
        host: true,
    },
});