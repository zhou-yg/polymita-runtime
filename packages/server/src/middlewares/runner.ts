import {
  IHookContext,
  getPlugin, IDiff, debuggerLog, startdReactiveChain,
  stopReactiveChain,
  getNamespace,
  ModelRunner
} from '@polymita/signal-model'
import { parseWithUndef, stringifyWithUndef } from '@polymita/connect'
import { join } from 'path'
import Application from 'koa'
import type { IConfig, IServerHookConfig } from '../config'
import { setCookies, setPrisma, setRunning, setER  } from '../plugins'
import { loadJSON, isComposedDriver } from '../util'
import { filterFileType } from './unserialize'
import { readFileSync } from 'node:fs'

function matchHookName (p: string) {
  const arr = p.split('/').filter(Boolean)
  return {
    pre: arr[0],
    driverName: arr[1]
  }
}

export function wrapCtx (ctx: {
  cookies: {
    set: any
    get: any
  }
}) {
  return {
    cookies: {
      set (name: any, value: any) {
        console.log('[wrapCtx.cookies] name, value: ', name, value);
        return ctx.cookies.set(name, value)
      },
      get (name: any) {
        console.log('[wrapCtx.cookies] get name: ', name);
        const val = ctx.cookies.get(name)
        return val
      }
    }
  }
}

/**
 * @TODO should provide by @tarat-run by default
 */
export default function taratMiddleware (args: {
  config: IConfig
}) : Application.Middleware{
  const { config } = args
  const { drivers, apiPre, diffPath, cwd, model, pointFiles } = config

  setRunning()
  setCookies()
  if (model?.engine === 'prisma') {
    setPrisma(config)
  } else if (model?.engine === 'er') {
    setER()
  }

  return async (ctx, next) => {
    const { path, body } = ctx.request
    const { pre, driverName } = matchHookName(path)
    if (pre === apiPre && ctx.request.method === 'POST') {      
      const hookConfig = drivers.find(h => h.name === driverName)
      if (hookConfig) {

        const driver = config.drivers.find(d => d.name === driverName)

        // driver has double nested output structure
        const BMPath = join(pointFiles.outputServerDriversDir, driver.relativeDir, `${driverName}.js`)

        const BM = require(BMPath).default

        const driverNamespace = getNamespace(BM)
        const driverComposed = isComposedDriver(BM);

        const modelIndexesPath = join(config.cwd, config.modelsDirectory, config.schemaIndexes)
        const wholeModelIndexes = require(modelIndexesPath)

        const modelIndexes = driverNamespace && driverComposed 
          ? wholeModelIndexes[driverNamespace]
          : wholeModelIndexes

        const c: IHookContext = typeof body === 'string' ? parseWithUndef(body) : body;

        let runner = new ModelRunner(BM, {
          beleiveContext: false,
          modelIndexes,
        })
        
        let scope = runner.prepareScope(c.initialArgList, c)
        getPlugin('GlobalRunning').setCurrent(scope, wrapCtx(ctx))

        console.log('==== before executeDriver ===============')

        const chain1 = startdReactiveChain(`${driverName}(init)`)

        runner.executeDriver(scope)

        await scope.ready()

        chain1.stop()
        chain1.print()

        debuggerLog(config.debugLog)

        const chain2 = startdReactiveChain(`${driverName}:call(${c.index})`)

        if (c.index !== undefined) {
          await scope.callHook(c.index, c.args)
        }

        await scope.ready()

        getPlugin('GlobalRunning').setCurrent(scope, null)

        chain2.stop()
        chain2.print()

        const context = scope.createPatchContext()
        /* @TODO: stringifyWithUndef prevent sending server File to browser */
        const contextWithoutFile = filterFileType(context)
        ctx.body = stringifyWithUndef(contextWithoutFile);

        (runner as any) = null;
        (scope as any) = null;

        console.log(`[${driverName}] is end \n ---`)
      } else {
        await next()        
      }
    } else if (pre === diffPath && ctx.request.method === 'POST') {
      const c: { entity: string, diff: IDiff } = JSON.parse(ctx.request.body)
      await getPlugin('Model').executeDiff('@unknownExecuteDiff', c.entity, c.diff)
      ctx.body = JSON.stringify({})
    } else {
      await next()
    }  
  } 
}
