import Router from '@koa/router';
import { IConfig } from '../../config';
import { createModuleManager } from './moduleManager';

export function createRouter(c: IConfig) {
  const router = new Router()

  const moduleManagerRouter = createModuleManager(c);
  router.use('/api/moduleManager', moduleManagerRouter.routes(), moduleManagerRouter.allowedMethods());

  return router
}


