import {
  readConfig,
  driversType,
  composeSchema,
  buildModelIndexes,
  buildViews,
  buildDrivers,
} from "../src/"
import { prepareDir } from './dev'

export default async (cwd: string) => {

  const config = await readConfig({
    cwd,
    isProd: true,
  })

  prepareDir(config)

  await buildDrivers(config)  
  await buildViews(config)
}