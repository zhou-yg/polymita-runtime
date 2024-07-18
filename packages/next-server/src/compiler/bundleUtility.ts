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

export async function buildDTS (c: IConfig, inputs: string[], outdir?: string) {
  const cli2 = `${inputs.join(' ')} --jsx react --module esnext --moduleResolution Node --jsxFactory h --allowJs --esModuleInterop --declaration --emitDeclarationOnly --outdir ${outdir}`.split(' ')
  
  await new Promise<void>(((resolve, reject) => {
    const instance = spawn(
      tsc,
      cli2,
      {
        cwd: c.cwd,
        env: process.env,
      },
    )
    instance.stderr.on('data', data => {
      // console.log(`[buildDTS] stderr:  ${data}`);
    })
    instance.stdout.on('data', data => {
      // console.log(`stdout:  ${data}`);
    })
    instance.on('close', (code, s) => {
      resolve()
    })
    instance.on('error', (err) => {
      console.log('[buildDTS] err: ', err);
      reject()
    })
  }))
}

export async function runTSC (c: IConfig, inputs: string[], outdir?: string) {
  const cli2 = `${inputs.join(' ')} --esModuleInterop --declaration --outdir ${outdir}`.split(' ')
  console.log('cli2: ', cli2);
  await new Promise<void>(((resolve, reject) => {
    const instance = spawn(
      tsc,
      cli2,
      {
        cwd: c.cwd,
        env: process.env,
      },
    )
    instance.stderr.on('data', data => {
      console.log(`[runTSC] stderr:  ${data}`);
    })
    instance.stdout.on('data', data => {
      console.log(`[runTSC] stdout:  ${data}`);
    })
    instance.on('close', (code, s) => {
      resolve()
    })
    instance.on('error', (err) => {
      console.log('[runTSC err: ', err);
      reject()
    })
  }))
}