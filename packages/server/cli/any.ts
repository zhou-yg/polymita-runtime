import {
  readConfig,
  driversType,
  composeSchema,
  buildModelIndexes,
  buildViews,
  buildDrivers,
  buildClientRoutes,
  logFrame,
  generateHookDeps,
  composeDriver,
} from "../src/"
import chalk from 'chalk'
import { prepareDir } from './dev'

export default async (cwd: string) => {

  const config = await readConfig({
    cwd,
    isProd: true,
  })

  prepareDir(config)

  await Promise.all([
    composeSchema(config),
    composeDriver(config)  
  ])

  await buildDrivers(config).then(() => {
    generateHookDeps(config);
    logFrame(`build drivers end.`)
  })

  await buildClientRoutes(config).then(() => {
    logFrame((`build ${chalk.green('clientRoutes')} end.`))    
  })

}