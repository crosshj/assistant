import { defineConfig } from 'vite';
import pkg from './package.json' assert { type: 'json' };

export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: 'index.html',
				gun: 'gun.html',
				reader: 'reader.html',
			},
		},
	},
	define: {
		__BUILD_DATE__: JSON.stringify(new Date().toISOString()),
		__PACKAGE_VERSION__: JSON.stringify(pkg.version),
	},
	server: {
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		},
	},
});
