import * as esbuild from 'esbuild';
import * as fs from 'node:fs'
import { IConfig } from '../../config';

export default function externalRelativeDrivers (c: IConfig): esbuild.Plugin {

  return {
    name: 'externalRelativeDrivers',
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.kind !== 'entry-point') {
          const isRelative = args.path.startsWith('.')
          if (isRelative) {
            const underDriverDir = args.resolveDir.replace(c.cwd, '').includes(c.signalsDirectory)
            if (underDriverDir) {
              return {
                external: true,
              }
            }
          }
        }
        return undefined
      })
    },
  };
};