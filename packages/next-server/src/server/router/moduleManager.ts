import Router from '@koa/router';
import { IConfig } from '../../config';
import * as path from 'path'
import * as fs from 'fs'
import { getCurrentDynamicConfig, overrideActivate, overrideInactivate, saveDynamicModule } from '../../config/dynamic';
import * as market from '../../service/market';
import axios from 'axios';
import { tryMkdir } from '../../util';

export function createModuleManager(c: IConfig) {
  const router = new Router()

  router.get('/status', async (ctx) => {
    ctx.body = JSON.stringify({
      dependencyModules: c.dependencyModules,
      dynamicModules: c.dynamicModules,
      activeModules: getCurrentDynamicConfig(c),
    }, null, 2)
  })

  router.post('/activate', async (ctx) => {
    const { name, config } = ctx.request.body
    const arr = overrideActivate(c, name, config)
    ctx.body = arr
  })
  router.post('/inactivate', async (ctx) => {
    const { name } = ctx.request.body
    const arr = overrideInactivate(c, name)
    ctx.body = arr
  })

  router.post('/import-remote', async (ctx) => {
    const { name, version } = ctx.request.body
    const detail = await market.detail(name, version)
    const { zip, meta, packageJson } = detail

    const zipFile = await axios(zip.url, { responseType: 'stream' })
  
    tryMkdir(c.pointFiles.currentFiles.dynamicModulesDir)

    const tmpZipFile = path.join(c.pointFiles.currentFiles.dynamicModulesDir, `${name}-${version}.zip`)
    const tempWriter = fs.createWriteStream(tmpZipFile)
    zipFile.data.pipe(tempWriter)
    await new Promise((resolve, reject) => {
      tempWriter.on('finish', resolve)
      tempWriter.on('error', reject)
    })
    const dynamicModuleDir = await saveDynamicModule(c, name, tmpZipFile)

    // clear
    fs.unlinkSync(tmpZipFile)

    ctx.body = {
      destDir: dynamicModuleDir,
      filepath: tmpZipFile,
    }
  })

  router.post('/import', async (ctx) => {
    const { moduleName } = ctx.request.body
    const moduleZip = ctx.request.files?.module as any; 
    /**
     * request.files data:
     * 
     *  PersistentFile {
          _events: [Object: null prototype] { error: [Function (anonymous)] },
          _eventsCount: 1,
          _maxListeners: undefined,
          lastModifiedDate: 2024-09-23T16:03:52.608Z,
          filepath: '/var/folders/76/zkkwwf3d6ll60rq7dryl303m0000gn/T/3decc87607f4d65c341447500',
          newFilename: '3decc87607f4d65c341447500',
          originalFilename: 'rs.zip',
          mimetype: 'application/zip',
          hashAlgorithm: false,
          size: 151712,
          _writeStream: WriteStream {}
        }
     */
    const zipFile = moduleZip?.filepath
    if (!zipFile) {
      throw new Error('field "module" zip file not found')
    }

    const dynamicModuleDir = await saveDynamicModule(c, moduleName, zipFile)
    
    ctx.body = {
      destDir: dynamicModuleDir,
      filepath: moduleZip?.filepath,
    }
  })

  return router
}
