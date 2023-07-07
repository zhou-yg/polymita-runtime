import tsPlugin from 'rollup-plugin-typescript2'
import dts from "rollup-plugin-dts"

function json() {
  return {
    name: 'json',
    // eslint-disable-next-line no-shadow
    transform(code, id) {
      if (id.slice(-5) !== '.json') return null;

      try {
        const parsed = JSON.parse(code);
        return {
          code: `export default ${code}`,
          map: { mappings: '' }
        };
      } catch (err) {
        const message = 'Could not parse JSON file';
        this.error({ message, id, cause: err });
        return null;
      }
    }
  };
}

const base = {
  plugins: [
    tsPlugin({
      clean: true,
      tsconfig: './tsconfig.json',
    }),
    json(),
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
    ...base,
    input: 'jsx-runtime.ts',
    output: {
      file: 'dist/jsx-runtime.js',
      format: 'esm',
    },
    external: ['@polymita/renderer'],
  },
  {
    input: "src/index.ts",
    output: [
      { file: "dist/renderer.d.ts", format: "es" }
    ],
    plugins: [
      dts(),
      // json(),
    ],
  },
  {
    input: "jsx-runtime.ts",
    output: [
      { file: "dist/jsx-runtime.d.ts", format: "es" }
    ],
    plugins: [
      dts(),
    ],
  }
]