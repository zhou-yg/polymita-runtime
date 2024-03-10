import * as esbuild from 'esbuild';
import * as fs from 'node:fs'

export default function aliasAtCodeToCwd (cwd: string): esbuild.Plugin {

  return {
    name: 'aliasAtCodeToCwd',
    setup(build) {
      build.onLoad({ filter: /modules\/.*/ }, args => {
        if (args.path) {
          
        }
      })
    },
  };
};