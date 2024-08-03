import * as esbuild from 'esbuild';
import * as fs from 'node:fs'

export default function aliasAtCodeToCwd (cwd: string): esbuild.Plugin {

  return {
    name: 'aliasAtCodeToCwd',
    setup(build) {
      build.onResolve({ filter: /@\/.*/ }, args => {
        const newPath = args.path.replace(/@\//, cwd + '/')

        let existExt = ''
        if (!fs.existsSync(newPath) && !/\.\w+/.test(newPath)) {
          existExt = ['.js', '.ts', '.tsx', '.jsx'].find(ext => {
            return fs.existsSync(newPath + ext)
          }) || '';
        }

        return { path: newPath + existExt }
      })
      build.onLoad({ filter: /(modules|overrides)\/.*/ }, async (args) => {

        const moduleCode = await fs.promises.readFile(args.path, 'utf8')

        const newCode = moduleCode.replace(/from\s("|')@\//g, 'from $1../')

        return {
          contents: newCode,
          loader: 'tsx'
        }
      })
    },
  };
};