import tsPlugin from 'rollup-plugin-typescript2'
import dts from "rollup-plugin-dts"
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json'
import commonjs from "@rollup/plugin-commonjs";

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
    },
  },
  {
    plugins: [
      json(),
      tsPlugin({
        clean: true,
        tsconfig: './tsconfig.json',
      }),
      commonjs(),     
    ],
    input: 'desktopSrc/desktop.ts',
    output: {
      file: 'dist/desktop.js',
      format: 'commonjs',
      sourcemap: true,     
    }
  }
]