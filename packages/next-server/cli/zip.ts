import { logFrame, zipOutput } from '../src'
import build from './build'

export default async (cwd: string) => {
  const config = await build(cwd, false)

  await zipOutput(config)

  logFrame('zip success at:', config.pointFiles.output.zip)

  return config
}
