import {
  readConfig,
  http
} from "../src";

export default async function start (cwd: string) {
  const config = await readConfig({
    cwd,
    isProd: true,
  })

  config.pointFiles = config.buildPointFiles

  await http.createServer(config)
}