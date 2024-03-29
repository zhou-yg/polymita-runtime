import * as esbuild from 'esbuild';
import * as path from 'path'
import * as fs from 'fs'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer';
import postcss from 'postcss'
import less from 'postcss-less'

const esbuildPluginPostcss = (options: {
  cwd: string
}): esbuild.Plugin => {

  return {
    name: 'postcss',
    setup(build) {
      build.onLoad({ filter: /\.(css|less)$/ }, async (args) => {
        const contents = await fs.promises.readFile(args.path, 'utf8');
        const result = await postcss([
          tailwindcss({
            config: path.join(options.cwd, 'tailwind.config.js')
          }),
          autoprefixer() as any
        ]).process(contents, {
          from: args.path,
          to: args.path,
          syntax: less,
        });

        const isCssModule = /\.module\./.test(args.path)
  
        return {
          contents: result.css,
          // loader: isCssModule ? 'local-css' : 'css',
          loader: 'css',
        };
      });
    },
  }
}


export default esbuildPluginPostcss