import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: {index: 'src/index.ts'},
  minify: false,
  clean: true,
  shims: true,
  outDir: 'dist',
  format: ['cjs', 'esm'],
  sourcemap: true,
  dts: true,
  target: false,
})
