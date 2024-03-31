import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import { cp } from "shelljs"
import { buildModules, buildSignals, copyModelFiles, generateLayoutTypes, generateViewFromModule, logFrame, readConfig, time } from '../src'


export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: true,
  })

  let t1 = time()

  await buildSignals(config)

  logFrame(`build signals in ${t1()}s`)

  await Promise.all([
    generateViewFromModule(config),
    buildModules(config),
  ])
  generateLayoutTypes(config)

  logFrame(`build views in ${t1()}s`)

  copyModelFiles(config)
}