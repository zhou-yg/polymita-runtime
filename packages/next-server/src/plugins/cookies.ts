import { CurrentRunnerScope, getPlugin, IRunningContext, loadPlugin } from '@polymita/signal-model'
import Application from 'koa'
import { scopeCtxMapVisitor } from '../middlewares/runner'

export function setCookies (scopeCtxMap: typeof scopeCtxMapVisitor) {

  loadPlugin('cookie', {
    async set(s, k, value) {
      // console.trace('[setCookies.set]: ', k, value);
      // console.log('[setCookies.set]: ', getPlugin('GlobalRunning').getCurrent(s), !!s);
      if (typeof value === 'string'){
        scopeCtxMap.get(s)?.cookies.set(k, value)
      }
    },
    async get(s, k): Promise<any> {
      const v = scopeCtxMap.get(s)?.cookies.get(k)
      // console.trace('[setCookies.get] s, k: ', k, v);
      // console.log('[setCookies.get] s, k: ', getPlugin('GlobalRunning').getCurrent(s));
      return v
    },
    clear(s, k) {
      scopeCtxMap.get(s)?.cookies.set(k, '')
    },
  })
}