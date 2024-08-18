import * as esbuild from 'esbuild';
import * as fs from 'node:fs'

export default function externalGlobals (globals: Record<string, string>): esbuild.Plugin {

  return {
    name: 'globals',
    setup(build) {

      const pkgs = Object.keys(globals).join('|')

      build.onResolve({ filter: new RegExp(`^(${pkgs})$`) }, (args) => {        
        return {
          path: args.path,
          namespace: 'my-globals-plugin',
        }
      });
  
      build.onLoad({ filter: /.*/, namespace: 'my-globals-plugin' }, (args) => {
        let ref = globals[args.path] || args.path;        
        if (!/window/.test(ref)) {
          ref = `window.${ref}`
        }

        const contents = `module.exports = ${ref}`;
        return { contents };
      });
    }
  };
};