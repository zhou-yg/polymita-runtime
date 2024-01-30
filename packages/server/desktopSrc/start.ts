/**
 * run electron in official releasing version
 */
import { IConfig } from '../src/config';
import { setupClient } from './core';
import {
  readConfig,
  http,
} from '../src'

async function createClient () {
  const cwd = process.cwd()

  const config = await readConfig({
    cwd,
    isProd: true,
  })

  await http.createServer(config)
  
  const client = setupClient(config)
  client.start()
}

createClient()