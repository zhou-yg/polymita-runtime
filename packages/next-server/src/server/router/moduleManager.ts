import Router from '@koa/router';
import { IConfig } from '../../config';
import * as path from 'path'
import { tryMkdir } from '../../util';


export function createModuleManager(c: IConfig) {
  const router = new Router()



  router.get('/list', async (ctx) => {
    ctx.body = JSON.stringify({
      dependencyModules: c.dependencyModules,
      dynamicModules: c.dynamicModules,
    }, null, 2)
  })


  router.post('/import', async (ctx) => {
    const { moduleName, modulePath } = ctx.request.body
    const moduleZip = [].concat(ctx.request.files.module)[0]
    console.log('ctx.request.files: ', moduleZip);
    let dynamicModuleDir = ''
    if (moduleName) {
      dynamicModuleDir = path.join(c.cwd, c.dynamicModulesDirectory, moduleName)
      tryMkdir(dynamicModuleDir)
    }
    ctx.body = {
      destDir: dynamicModuleDir,
      filepath: moduleZip?.filepath,
    }
  })

  return router
}
