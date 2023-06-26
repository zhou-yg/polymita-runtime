import {
  readConfig,
  composeSchema,
  composeDriver,
} from "../src/"
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

  console.log('compose done')
}