import { logFrame, readConfig, zipOutput } from '../src'
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

  if (!fs.existsSync(config.pointFiles.output.zip)) {
    throw new Error('zip file not found')
  }

  const fd = new FormData();

  fd.append('file', fs.createReadStream(config.pointFiles.output.zip));
  fd.append('meta', fs.createReadStream(config.pointFiles.output.meta));
  fd.append('packageJson', fs.createReadStream(config.packageJSONPath));
  // fd.append('file', new Blob([fs.readFileSync(config.pointFiles.output.zip)]), 'index.zip');
  // fd.append('meta', new Blob([fs.readFileSync(config.pointFiles.output.meta)]), 'index.meta');
  // fd.append('packageJson', new Blob([fs.readFileSync(config.packageJSONPath)]), 'package.json');
  fd.append('name', config.packageJSON.name!);
  fd.append('version', config.packageJSON.version!);

  const res = await axios('https://polymita.cc/api/market/upload', {
    method: 'POST',
    data: fd,
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  })

  if (res.status !== 200) {
    throw new Error('upload failed')
  }

  const data = res.data

  logFrame('upload success', data)
}
