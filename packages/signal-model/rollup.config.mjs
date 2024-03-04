import tsPlugin from 'rollup-plugin-typescript2'
import dts from "rollup-plugin-dts"
import replace from '@rollup/plugin-replace';
// import { nodeResolve } from '@rollup/plugin-node-resolve';

const libName = 'signal-model'

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
      file: `dist/${libName}.js`,
      format: 'cjs'
    }
  },
  {
    input: "src/index.ts",
    output: [
      { file: `dist/${libName}.esm.d.ts`, format: "es" },
      { file: `dist/${libName}.d.ts`, format: "es" },
    ],
    plugins: [
      dts(),
    ],
  }
]