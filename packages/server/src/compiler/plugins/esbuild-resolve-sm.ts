import * as esbuild from 'esbuild';
import * as fs from 'node:fs'
import { IConfig } from '../../config';

export default function resolveSignalModel (format: esbuild.Format): esbuild.Plugin {

  return {
    name: 'resolveSignalModel',
    setup(build) {
      build.onResolve({ filter: /^@polymita\/signal-model$/ }, args => {
        return {
          path: format === 'esm' ? 'node_modules/@polymita/signal-model/dist/signal-model.client.esm.js' : 'node_modules/@polymita/signal-model/dist/signal-model.client.js' ,
          external: true,
        }
      })
    },
  };
};