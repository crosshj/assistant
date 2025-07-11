import { defineConfig } from 'vite';
import pkg from './package.json' assert { type: 'json' };

export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: true,
	},
	define: {
		__BUILD_DATE__: JSON.stringify(new Date().toISOString()),
		__PACKAGE_VERSION__: JSON.stringify(pkg.version),
	},
	server: {
		port: 4422,
		proxy: {
			'/api': 'http://localhost:4433',
		},
	},
});
