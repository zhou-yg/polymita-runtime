import * as esbuild from 'esbuild';
import * as fs from 'node:fs'

export default function aliasAtCodeToCwd (cwd: string): esbuild.Plugin {
  return {
    name: 'aliasAtCodeToCwd',
    setup(build) {
      build.onLoad({ filter: /drivers\// }, args => {
        const code = fs.readFileSync(args.path).toString()
        const newCode2 = code.replace(/@\//, cwd + '/')
        return {
          contents: newCode2,
          loader: /\.ts$/.test(args.path) ? 'ts' : 'js'
        }
      });
    },
  };
};