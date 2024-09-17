import Router from '@koa/router';
import { IConfig } from '../../config';

export function createModuleManager(c: IConfig) {
  const router = new Router()

  router.get('/list', async (ctx) => {
    ctx.body = 'Hello World'
  })


  return router
}
