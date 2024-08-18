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
  external: ['immer', '@polymita/signal'],
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
      format: 'esm',
      globals: {
        '@polymita/signal': '@polymita/signal'
      }
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
      file: `dist/${libName}.cjs.js`,
      format: 'cjs',
      globals: {
        '@polymita/signal': '@polymita/signal'
      }
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
      format: 'umd',
      globals: {
        '@polymita/signal': '@polymita/signal'
      }
    },
  },
  {
    input: "src/index.ts",
    output: [
      { file: `dist/${libName}.esm.d.ts`, format: "es" },
      { file: `dist/${libName}.umd.d.ts`, format: "es" },
      { file: `dist/${libName}.cjs.d.ts`, format: "es" },
    ],
    plugins: [
      dts(),
    ],
  }
]