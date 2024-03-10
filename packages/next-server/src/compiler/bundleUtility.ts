import * as path from 'path'
import * as fs from 'fs'
import * as officialEsbuild from 'esbuild';
import { IConfig } from '../config';
import { exec } from 'child_process';

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

export async function buildDTS (c: IConfig, input: string, output: string) {
  const cli = `npx tsc ${input} --declaration --allowJs --emitDeclarationOnly --outFile ${output}`
  
  await new Promise<void>(((resolve, reject) => {
    exec(
      cli,
      {
        cwd: c.cwd
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    )
  }))

  const outputTSD = fs.readFileSync(output, 'utf-8')
  const rows = outputTSD.split('\n');

  fs.writeFileSync(
    rows.slice(1, rows.length - 2).join('\n'),
    output
  )
}