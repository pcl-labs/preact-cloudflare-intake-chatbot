import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		preact({
			prerender: {
				enabled: true,
				renderTarget: '#app',
			},
		}),
	],
	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				passes: 2,
			},
		},
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),              // Regular app
			},
			output: {
				// Main app build
				dir: 'dist',
				entryFileNames: 'assets/[name]-[hash].js',
				chunkFileNames: 'assets/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash].[ext]',
			},
		},
		cssCodeSplit: true,
		reportCompressedSize: true,
		emptyOutDir: true,
		sourcemap: false,  // Change to true for development
	},
	optimizeDeps: {
		include: ['preact', 'preact/hooks'],
	},
});
