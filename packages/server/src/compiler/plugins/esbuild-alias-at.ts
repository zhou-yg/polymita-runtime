import * as esbuild from 'esbuild';
import * as fs from 'node:fs'

export default function aliasAtCodeToCwd (cwd: string): esbuild.Plugin {
  return {
    name: 'aliasAtCodeToCwd',
    setup(build) {
      build.onResolve({ filter: /@\/.*/ }, args => {
        const newPath = args.path.replace(/@\//, cwd + '/')
        return { path: newPath }
      })
    },
  };
};