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
}

export default [
  ['index', base],
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