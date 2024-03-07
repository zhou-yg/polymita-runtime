import * as esbuild from 'esbuild';
import * as fs from 'node:fs'
import * as path from 'node:path'
import { removeFunctionBody } from '../ast';
import { cp, mkdir, rm } from "shelljs";

export default function clearFunctionBodyEsbuildPlugin (
  dir: string,
  names: string[],cache: string[]
): esbuild.Plugin {
  !fs.existsSync(dir) && mkdir(dir)

  return {
    name: 'clear tarat runtime function body',
    setup(build) {
      /** @TODO should match more explicit */
      build.onResolve({ filter: /drivers\// }, args => {
        if (!fs.existsSync(args.path)) {
          return null
        }
        const { base, dir: fileDir } = path.parse(args.path)
        
        const code = fs.readFileSync(args.path).toString()
        const newCode2 = removeFunctionBody(code, names)

        const destFile = path.join(fileDir, 'cache_' + base)
        cache.push(destFile)

        fs.writeFileSync(destFile, newCode2)

        return {
          path: destFile,
          sideEffects: false
        }
      })

      // build.onLoad({ filter: /drivers\// }, args => {
      //   console.log('args: ', args);
      //   const code = fs.readFileSync(args.path).toString()

      //   const newCode2 = removeFunctionBody(code, names)
      //   console.log('newCode2: ', newCode2);

      //   return {
      //     contents: newCode2,
      //     loader: /\.ts$/.test(args.path) ? 'ts' : 'js'
      //   }
      // })
    },
  }
}