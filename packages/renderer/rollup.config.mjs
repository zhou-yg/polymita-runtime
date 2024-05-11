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

function treatRendererAsRelativeAndExternal (format) {
  const postfix = format === 'esm' ? 'esm.js' : 'js'
  return {
    name: 'treatRendererAsRelativeAndExternal',
    resolveId: {
      order: 'pre',
      async handler (id) {
        if (id === './src/index') {
          return {
            id: `./renderer.${postfix}`, 
            external: true
          }
        }
      }
    }
  }
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
      { file: "dist/renderer.d.ts", format: "es" },
      { file: "dist/renderer.esm.d.ts", format: "es" }
    ],
    plugins: [
      dts(),
    ],
  },
  {
    input: 'jsx-runtime.ts',
    output: {
      file: 'dist/jsx-runtime.esm.js',
      format: 'esm',
      paths: {
        src: './'
      }
    },
    plugins: [
      tsPlugin({
        clean: true,
        tsconfig: './tsconfig.json',
      }),
      json(),  
      treatRendererAsRelativeAndExternal('esm'),
    ]
  },
  {
    input: 'jsx-runtime.ts',
    output: {
      file: 'dist/jsx-runtime.js',
      format: 'cjs',
      paths: {
        src: './'
      }
    },
    plugins: [
      tsPlugin({
        clean: true,
        tsconfig: './tsconfig.json',
      }),
      json(),  
      treatRendererAsRelativeAndExternal('cjs'),
    ]
  },
  // {
  //   input: "jsx-runtime.ts",
  //   output: [
  //     { file: "dist/jsx-runtime.d.ts", format: "es" }
  //   ],
  //   plugins: [
  //     dts(),
  //   ],
  // }
]