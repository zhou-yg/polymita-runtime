import tsPlugin from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts"

import fs from 'fs'

const tsconfig = JSON.parse(fs.readFileSync('../../tsconfig.json', 'utf8'))
const tsconfig2 = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'))

export default [
  {
    plugins: [
      json(),
      tsPlugin({
        clean: true,
        tsconfig: './tsconfig.json',
      }),
      commonjs(),
    ],
    input: 'cli/index.ts',
    output: {
      file: 'dist/cli/index.js',
      format: 'commonjs',
      sourcemap: true,
      banner: '#!/usr/bin/env node',
    },
  },
  {
    input: 'src/index.ts',
    output: [
      { file: `dist/lib.d.ts`, format: 'es' }
    ],
    plugins: [
      dts(),
    ],
  }
]