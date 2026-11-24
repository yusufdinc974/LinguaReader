import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Content-Security-Policy of the built app. The page shows untrusted PDFs and
// comics, so it may only run its own scripts and talk to nothing but its own
// files (translation and sync go through the main process). 'wasm-unsafe-eval'
// lets pdf.js run its image decoders; it does not allow eval() of JavaScript.
const CSP = [
    "default-src 'none'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' data: blob:",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
].join('; ')

/** Adds the CSP to index.html in builds (the dev server needs inline scripts). */
function contentSecurityPolicy(): Plugin {
    return {
        name: 'linguareader-csp',
        apply: 'build',
        transformIndexHtml: html =>
            html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    }
}

/** Copies pdf.js data files (CMaps, fonts, decoders) into dist/pdfjs/ so they work offline. */
function pdfjsAssets(): Plugin {
    const dirs = ['cmaps', 'standard_fonts', 'wasm', 'iccs']
    return {
        name: 'linguareader-pdfjs-assets',
        apply: 'build',
        writeBundle(options) {
            const out = options.dir ?? path.resolve(__dirname, 'dist')
            for (const d of dirs) {
                const from = path.resolve(__dirname, 'node_modules/pdfjs-dist', d)
                if (fs.existsSync(from)) fs.cpSync(from, path.join(out, 'pdfjs', d), { recursive: true })
            }
        },
    }
}

export default defineConfig({
    plugins: [react(), contentSecurityPolicy(), pdfjsAssets()],
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
    },
})
