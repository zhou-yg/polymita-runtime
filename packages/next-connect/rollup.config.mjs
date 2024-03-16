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
  external: ['react', '@polymita/signal-model'],
}
const reactBase = {
  plugins: [
    tsPlugin({
      clean: true,
      tsconfig: './tsconfig.json',
    }),
  ],
  input: 'src/adaptor/react.ts',
  external: ['react', '@polymita/signal-model'],
}

export default [
  ['connect', base],
  // ['react', reactBase]
].map(([name, config]) => {
  return [
    {
      ...config,
      output: {
        file: `dist/${name}.js`,
        format: 'commonjs'
      },
    },
    {
      ...config,
      output: {
        file: `dist/${name}.esm.js`,
        format: 'esm'
      },
    },
    {
      input: config.input,
      output: [
        { file: `dist/${name}.d.ts`, format: 'es' }
      ],
      plugins: [
        dts(),
      ],
    }
  ]
}).flat()