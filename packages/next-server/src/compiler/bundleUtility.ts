import * as path from 'path'
import * as fs from 'fs'
import * as officialEsbuild from 'esbuild';
import { IConfig } from '../config';
import { exec, spawn } from 'child_process';

const define = {}
const internalEnv = [
  'SERVER_PORT',
  'NODE_ENV',
  'POLYMITA_ENV',
  'POLYMITA_VERSION'
]
for (const k of internalEnv) {
  // define[`process.env.${k}`] = JSON.stringify(internalEnv[k] || '""')
}

export function esbuild (op: officialEsbuild.BuildOptions) {

  return officialEsbuild.build({
    ...op,
    define: {
      ...define,
      ...op.define,
    }
  })
}

const tsc = 'node_modules/typescript/bin/tsc';

export async function buildDTS (c: IConfig, input: string, output?: string) {
  if (!output) {
    const parsedInput = path.parse(input)
    output = path.join(parsedInput.dir, `${parsedInput.name}.d.ts`)
  }
  const outdir =  path.parse(output).dir
  // const cli2 = `${input} --jsx react --module esnext --jsxFactory h --allowJs --esModuleInterop --declaration --emitDeclarationOnly --outFile ${output}`.split(' ')
  const cli2 = `${input} --jsx react --module esnext --moduleResolution Node --jsxFactory h --allowJs --esModuleInterop --declaration --emitDeclarationOnly --outdir ${outdir}`.split(' ')
  console.log('cli2: ', cli2.join(' '));
  
  await new Promise<void>(((resolve, reject) => {
    const instance = spawn(
      tsc,
      cli2,
      {
        cwd: c.cwd,
        env: process.env,
      },
      // (err, stdout, stderr) => {
      //   console.log('err: ', err);
      //   console.log('stdout: ', stdout);
      //   console.log('stderr: ', stderr);
      //   if (err) {
      //     reject(err)
      //   } else {
      //     resolve()
      //   }
      // }
    )
    instance.stderr.on('data', data => {
      console.log(`stderr:  ${data}`);
    })
    instance.stdout.on('data', data => {
      console.log(`stdout:  ${data}`);
    })
    instance.on('close', (code, s) => {
      console.log('code, s: ', code, s);
      resolve()
    })
    instance.on('error', (err) => {
      console.log('err: ', err);
      reject()
    })
  }))

  // if (fs.existsSync(output)) {
  //   const outputTSD = fs.readFileSync(output, 'utf-8')
  //   const rows = outputTSD.split('\n');
  
  //   fs.writeFileSync(
  //     output,
  //     rows.slice(1, rows.length - 2).join('\n'),
  //   )
  // }
}