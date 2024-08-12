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
}

module.exports = [
  ['index', base],
  // ['react', reactBase]
].map(([name, config]) => {
  return [
    {
      ...config,
      output: {
        file: `dist/${name}.umd.js`,
        format: 'umd',
        name: pkg.name,
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