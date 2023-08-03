import * as fs from 'fs'
import { IConfig } from "../config"
import { RunnerModelScope, debuggerLog, startdReactiveChain } from "@polymita/signal-model";
import { renderToString } from 'react-dom/server'
import React from 'react'
import chalk from 'chalk'
import { logFrame, projectRelativePath } from '../util';
import { scopeCtxMapVisitor } from '../middlewares/runner';
import Application from 'koa';

export interface PageContext {
  cookies: {
    get: any;
    set: any;
  }
  location: string
}
export function wrapCtx (ctx: PageContext) {
  return {
    cookies: {
      set (name: any, value: any) {
        // console.log('[wrapCtx.cookies] name, value: ', name, value);
        return ctx.cookies.set(name, value)
      },
      get (name: any) {
        // console.log('[wrapCtx.cookies] get name: ', name);
        const val = ctx.cookies.get(name)
        return val
      }
    }
  }
}

export async function renderPage (
  config: IConfig,
  ctx: Application.ParameterizedContext<Application.DefaultState, Application.DefaultContext, any>,
) {
  const { distServerRoutes, distEntryJS, distEntryCSS, distServerRoutesCSS } = config.pointFiles

  let entryFunctionModule = (doc: React.ReactElement) => doc
  if (fs.existsSync(distEntryJS)) {
    entryFunctionModule = require(distEntryJS).default
  }
  logFrame(`distServerRoutes:${distServerRoutes}`)
  const {
    default: routesEntryModule,
    getReactAdaptor,
  } = require(distServerRoutes)

  const reactRenderDriver = getReactAdaptor()

  const routerLocation = ctx.request.path + ctx.request.search

  const chain = startdReactiveChain('[renderWithDriverContext first]')

  const appRootEntry = reactRenderDriver.getRoot(
    entryFunctionModule(
      routesEntryModule({
        location: routerLocation
      })
    )
  )

  let cancelGlobalRunning = () => {}

  console.log('[before driver.onPush] : ');

  reactRenderDriver.driver.onPush(scope => {

    scopeCtxMapVisitor.set(scope, ctx)
    cancelGlobalRunning = () => {
      scopeCtxMapVisitor.set(scope, null)
    }
  })

  debuggerLog(true)

  console.log('[before renderToString] first ');
  const html = renderToString(appRootEntry)

  reactRenderDriver.driver.pushListener = undefined
  cancelGlobalRunning()

  let allRunedHook: RunnerModelScope<any>[] = []
  for (const BMArr of reactRenderDriver.driver.BMValuesMap.values()) {
    allRunedHook = allRunedHook.concat(BMArr)
  }
  await Promise.all(allRunedHook.map((scope) => {
    return scope.ready()
  }))
  chain.stop()
  chain.print()

  console.log('---- await first done ----')

  const st = Date.now()

  reactRenderDriver.driver.switchToServerConsumeMode()

  const chain2 = startdReactiveChain('[renderWithDriverContext second]')

  const appEntryUpdate = reactRenderDriver.getUpdateRoot(
    entryFunctionModule(
      routesEntryModule({
        location: routerLocation
      })
    ),
  )

  const html2 = renderToString(appEntryUpdate)

  chain2.stop()
  chain2.print()

  const cost = Date.now() - st

  const css = [
    fs.existsSync(distEntryCSS) && distEntryCSS,
    fs.existsSync(distServerRoutesCSS) && distServerRoutesCSS,
  ].filter(Boolean).map(path => projectRelativePath(config, path))
  
  console.log(`[${routerLocation}] is end. second rendering cost ${chalk.blue(cost)} ms \n ---`)

  return {
    driver: reactRenderDriver.driver,
    html,
    html2,
    css,
  }
}
