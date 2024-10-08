import { logFrame, readConfig, tryMkdir, zipOutput } from '../src'
import * as fs from 'fs'
import * as path from 'path'
// import fetch from 'node-fetch'
import FormData from 'form-data'
import axios from 'axios'

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: true,
    isRelease: false,
  })

  tryMkdir(config.pointFiles.currentFiles.dynamicModulesDir)

  
}
