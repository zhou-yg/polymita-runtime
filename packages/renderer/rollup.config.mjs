import tsPlugin from 'rollup-plugin-typescript2'
import dts from "rollup-plugin-dts"

const base = {
  plugins: [
    tsPlugin({
      clean: true,
      tsconfig: './tsconfig.json',
    }),
  ],
  input: 'src/index.ts',
  external: [],
}

export default [
  {
    ...base,
    output: {
      file: 'dist/renderer.js',
      format: 'commonjs'
    },
  },
  {
    ...base,
    output: {
      file: 'dist/renderer.esm.js',
      format: 'esm'
    },
  },
  {
    input: "src/index.ts",
    output: [
      { file: "dist/renderer.d.ts", format: "es" }
    ],
    plugins: [
      dts(),
    ],
  }
]