import Router from '@koa/router';
import { IConfig } from '../../config';
import * as path from 'path'
import { decompress, tryMkdir } from '../../util';
import { getActiveModules, overrideActivate, overrideInactivate, saveDynamicModule } from '../../config/dynamic';

export function createModuleManager(c: IConfig) {
  const router = new Router()

  router.get('/status', async (ctx) => {
    ctx.body = JSON.stringify({
      dependencyModules: c.dependencyModules,
      dynamicModules: c.dynamicModules,
      activeModules: getActiveModules(c),
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

  router.post('/import', async (ctx) => {
    const { moduleName } = ctx.request.body
    const moduleZip = [].concat(ctx.request.files.module)[0]
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
