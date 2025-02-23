import { IConfig, logFrame, readConfig, reduceScopePrefix, zipOutput } from '../src'
import * as fs from 'fs'
import * as path from 'path'
// import fetch from 'node-fetch'
import FormData from 'form-data'
import axios from 'axios'


async function linkToLocal (
  config: IConfig,
  localPort: number,
) {
  const formData = new FormData();
  
  try {
    formData.append('moduleName', reduceScopePrefix(config.packageJSON.name || ''));
    formData.append('module', fs.createReadStream(config.pointFiles.output.zip));

    const res = await axios.post(
      `http://localhost:${localPort}/api/moduleManager/import`,
      formData,
      {
        maxBodyLength: 1024 * 1024 * 1024,
        maxContentLength: 1024 * 1024 * 1024,
        headers: {
          ...formData.getHeaders()
        }
      }
    );
    if (res.status === 200) {
      logFrame('[linkToLocal] success')
    }  
  } catch (error) {
    console.error(`Failed to upload to local service: ${error.message}`);
  }
}

export default async (cwd: string, options: {
  localPort: number
}) => {
  const config = await readConfig({
    cwd,
    isProd: true,
    isRelease: false,
  })

  if (!fs.existsSync(config.pointFiles.output.zip)) {
    throw new Error('zip file not found')
  }

  if (!config.packageJSON.name) {
    throw new Error('Must specific "name" in package.json ')
  }

  try {
    await linkToLocal(config, options.localPort)
  } catch (e) {
    console.error(e)
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

  logFrame('upload to remote ...')
  const res = await axios('https://polymita.cc/api/market/upload', {
    method: 'POST',
    data: fd,
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  })
  logFrame('upload to remote end')

  if (res.status !== 200) {
    throw new Error('upload failed')
  } else {
    const data = res.data
  
    logFrame('upload result', data)
  }
}
