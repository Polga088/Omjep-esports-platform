import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
const VITE_DEV_PORT = 3000;
const API_PROXY_TARGET = (process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3002').trim();
function resolvePort(url) {
    if (url.port)
        return url.port;
    if (url.protocol === 'https:')
        return '443';
    if (url.protocol === 'http:')
        return '80';
    return '';
}
function assertValidProxyTarget(target, viteActivePort) {
    let parsed;
    try {
        parsed = new URL(target);
    }
    catch {
        throw new Error(`[vite] Invalid VITE_API_PROXY_TARGET="${target}". Expected a full URL like "http://localhost:3002".`);
    }
    const isLoopbackHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    const targetPort = resolvePort(parsed);
    const isSelfProxy = isLoopbackHost && targetPort === String(viteActivePort);
    if (isSelfProxy) {
        throw new Error(`[vite] Refusing self-proxy: VITE_API_PROXY_TARGET="${target}" resolves to same active Vite server port ${viteActivePort}. ` +
            `Use a backend URL on a different port (example: http://localhost:3002).`);
    }
}
assertValidProxyTarget(API_PROXY_TARGET, VITE_DEV_PORT);
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules'))
                        return undefined;
                    if (id.includes('framer-motion'))
                        return 'motion-vendor';
                    if (id.includes('@tanstack/react-query'))
                        return 'query-vendor';
                    if (id.includes('react-router'))
                        return 'router-vendor';
                    if (id.includes('react-dom'))
                        return 'react-dom-vendor';
                    if (id.includes('react'))
                        return 'react-vendor';
                    return 'vendor-misc';
                },
            },
        },
    },
    optimizeDeps: {
        /** Évite les erreurs de pré-bundle sur le workspace `@omjep/shared` après changement d’exports. */
        include: ['@omjep/shared'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: VITE_DEV_PORT,
        strictPort: true,
        proxy: {
            '/api': {
                target: API_PROXY_TARGET,
                changeOrigin: true,
            },
            '/socket.io': {
                target: API_PROXY_TARGET,
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
