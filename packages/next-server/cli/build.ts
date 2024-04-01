import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import { cp } from "shelljs"
import { buildModelIndexes, buildModules, buildSignals, composeSchema, composeSignal, copyModelFiles, generateLayoutTypes, generateModelTypes2, generateViewFromModule, logFrame, preCheckSchema, readConfig, time } from '../src'


export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: true,
  })

  await Promise.all([
    composeSchema(config),
    composeSignal(config)  
  ])
  await preCheckSchema(config);
  await Promise.all([
    buildModelIndexes(config),
  ])
  await generateModelTypes2(config)

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