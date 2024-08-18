const tsPlugin = require('rollup-plugin-typescript2')
const dts = require("rollup-plugin-dts").default
const pkg = require('./package.json')

const base = {
  plugins: [
    tsPlugin({
      clean: true,
      tsconfig: './tsconfig.json',
    }),
  ],
  input: 'src/index.ts',
  external: ['eventemitter3', 'immer'],
}

export default [
  {
    ...base,
    plugins: [
      ...base.plugins,
    ],
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: pkg.name,
      sourcemap: true,
    },
  },
  {
    ...base,
    plugins: [
      ...base.plugins,
    ],
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
  },
  {
    ...base,
    plugins: [
      ...base.plugins,
    ],
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  },
  {
    input: "src/index.ts",
    output: [
      { file: "dist/index.esm.d.ts", format: "es" },
      { file: "dist/index.umd.d.ts", format: "es" },
      { file: "dist/index.cjs.d.ts", format: "es" },
    ],
    plugins: [
      dts(),
    ],
  }
]