import Router from '@koa/router';
import { IConfig } from '../../config';
import * as path from 'path'
import * as fs from 'fs'
import { getCurrentDynamicConfig, overrideActivate, overrideInactivate, overrideRootConfig, overrideUpdateModuleConfig, saveDynamicModule } from '../../config/dynamic';
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

  router.post('/update-config', async (ctx) => {
    const { name, config } = ctx.request.body
    const result = overrideUpdateModuleConfig(c, name, config)
    ctx.body = !!result
  })
  router.post('/update-root-config', async (ctx) => {
    const { config } = ctx.request.body
    const result = overrideRootConfig(c, config)
    ctx.body = !!result
  })
  router.post('/override-module', async (ctx) => {
    const { name } = ctx.request.body
    /**
     * 1.find target module from dynamicModules using 'name
     * 2.get target module package name
     * 3.create empty polymita project and add target module as dependency
     * 4.open project using cursor
     */
    
  })

  router.get('/modules', async (ctx) => {
    
  })

  router.post('/import-remote', async (ctx) => {
    const { name, version } = ctx.request.body
    console.log('name, version: ', name, version);
    const detail = await market.detail(name, version)
    console.log('detail: ', detail);
    const { zip, meta, packageJson } = detail

    const zipFile = await axios(zip.url, { responseType: 'stream' })
  
    tryMkdir(c.pointFiles.currentFiles.dynamicModulesDir)

    const convertedName = name.replace(/^@\w+\//g, '')

    const tmpZipFile = path.join(c.pointFiles.currentFiles.dynamicModulesDir, `${convertedName}-${version}.zip`)
    console.log('tmpZipFile: ', tmpZipFile);
    const tempWriter = fs.createWriteStream(tmpZipFile)
    zipFile.data.pipe(tempWriter)
    await new Promise((resolve, reject) => {
      tempWriter.on('finish', resolve)
      tempWriter.on('error', reject)
    })
    const dynamicModuleDir = await saveDynamicModule(c, convertedName, tmpZipFile)

    console.log('before reload: ');

    await c.reload()
    // clear
    fs.unlinkSync(tmpZipFile)

    ctx.body = {
      destDir: dynamicModuleDir,
      filepath: tmpZipFile,
    }
  })

  router.get('/import-page', async (ctx) => {
    ctx.set('Content-Type', 'text/html')
    ctx.body = `
      <form action="/api/moduleManager/import" method="post" enctype="multipart/form-data">
        <div>
          <input name="moduleName" />
        </div>
        <div>
          <input type="file" name="module" />
        </div>
        <button type="submit">upload</button>
      </form>
    `
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
    
    await c.reload()

    ctx.body = {
      destDir: dynamicModuleDir,
      filepath: moduleZip?.filepath,
    }
  })

  return router
}
