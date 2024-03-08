import {
  readConfig,
  logFrame,
  generateHookDeps,
  composeDriver,
} from "../src/"

export default async (cwd: string) => {

  const config = await readConfig({
    cwd,
    isProd: true,
  })
}