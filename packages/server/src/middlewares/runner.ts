import {
  IHookContext,
  getPlugin, IDiff, debuggerLog, startdReactiveChain,
  stopReactiveChain,
  getNamespace,
  ModelRunner,
  CurrentRunnerScope
} from '@polymita/signal-model'
import { parseWithUndef, stringifyWithUndef } from '../plugins/preset'
import { join } from 'path'
import Application from 'koa'
import type { IConfig, IServerHookConfig } from '../config'
import { setCookies, setPrisma, setER  } from '../plugins'
import { loadJSON, isComposedDriver } from '../util'
import { filterFileType } from './unserialize'

function matchHookName (p: string) {
  const arr = p.split('/').filter(Boolean)
  return {
    pre: arr[0],
    driverName: arr[1]
  }
}

const scopeCtxMap: Map<CurrentRunnerScope, Application.ParameterizedContext<Application.DefaultState, Application.DefaultContext, any>> = new Map()

export const scopeCtxMapVisitor = {
  set (scope: CurrentRunnerScope, ctx: Application.ParameterizedContext<Application.DefaultState, Application.DefaultContext, any>) {
    scopeCtxMap.set(scope, ctx)
  },
  get (scope: CurrentRunnerScope) {
    return scopeCtxMap.get(scope)
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

  setCookies(scopeCtxMapVisitor)
  if (model?.engine === 'prisma') {
    setPrisma(config)
  } else if (model?.engine === 'er') {
    setER()
  }

  return async (ctx, next) => {
    const { path, body, headers } = ctx.request
    const { pre, driverName } = matchHookName(path)
    if (pre === apiPre && ctx.request.method === 'POST') {      
      const hookConfig = drivers.find(h => h.name === driverName)
      if (hookConfig) {
        const disableChainLog = headers['disable-chain-log'] === 'true'

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
          believeContext: false,
          modelIndexes,
        })
        
        let scope = runner.prepareScope(c.initialArgList, c)
        scopeCtxMapVisitor.set(scope, ctx)

        console.log('==== before executeDriver ===============')

        const chain1 = startdReactiveChain(`${driverName}(init)`)

        runner.executeDriver(scope)

        await scope.ready()

        chain1.stop()
        !disableChainLog && chain1.print()

        debuggerLog(config.debugLog)

        const chain2 = startdReactiveChain(`${driverName}:call(${c.index})`)

        if (c.index !== undefined) {
          await scope.callHook(c.index, c.args)
        }

        await scope.ready()

        scopeCtxMapVisitor.set(scope, null)

        chain2.stop()
        !disableChainLog && chain2.print()

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
