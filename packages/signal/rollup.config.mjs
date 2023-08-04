import tsPlugin from 'rollup-plugin-typescript2'
import dts from "rollup-plugin-dts"
import replace from '@rollup/plugin-replace';
// import { nodeResolve } from '@rollup/plugin-node-resolve';

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
      file: 'dist/signal.js',
      format: 'commonjs',
      sourcemap: true,
    },
  },
  {
    ...base,
    plugins: [
      ...base.plugins,
    ],
    output: {
      file: 'dist/signal.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  },
  {
    input: "src/index.ts",
    output: [
      { file: "dist/signal.esm.d.ts", format: "es" },
      { file: "dist/signal.d.ts", format: "es" },
    ],
    plugins: [
      dts(),
    ],
  }
]