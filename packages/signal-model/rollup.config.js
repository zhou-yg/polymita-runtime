const tsPlugin = require('rollup-plugin-typescript2')
const dts = require("rollup-plugin-dts").default
const replace = require('@rollup/plugin-replace')
const pkg = require('./package.json')

const libName = 'index'

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
      replace({
        preventAssignment: true
      }),
    ],
    output: {
      file: `dist/${libName}.esm.js`,
      format: 'esm'
    }
  },
  {
    ...base,
    plugins: [
      ...base.plugins,
      replace({
        preventAssignment: true
      }),
    ],
    output: {
      file: `dist/${libName}.umd.js`,
      name: pkg.name,
      format: 'umd'
    }
  },
  {
    input: "src/index.ts",
    output: [
      { file: `dist/${libName}.esm.d.ts`, format: "es" },
      { file: `dist/${libName}.umd.d.ts`, format: "es" },
    ],
    plugins: [
      dts(),
    ],
  }
]