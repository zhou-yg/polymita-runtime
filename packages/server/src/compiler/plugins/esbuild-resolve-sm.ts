import * as esbuild from 'esbuild';
import * as fs from 'node:fs'
import { IConfig } from '../../config';

export default function resolveSignalModel (format: esbuild.Format): esbuild.Plugin {

  return {
    name: 'resolveSignalModel',
    setup(build) {
      build.onResolve({ filter: /^@polymita\/signal-model$/ }, args => {
        return {
          path: format === 'esm' ? '@polymita/signal-model/dist/signal-model.client.esm' : '@polymita/signal-model/dist/signal-model.client' ,
          external: true,
        }
      })
    },
  };
};