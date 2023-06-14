import * as fs from 'fs'
import { IConfig } from "../config"
import { ReactAdaptor } from '@polymita/connect'
import { RunnerModelScope, debuggerLog, getPlugin, startdReactiveChain } from "@polymita/signal-model";
import { renderToString } from 'react-dom/server'
import React from 'react'
import chalk from 'chalk'
import { logFrame } from '../util';

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

export async function renderPage (ctx: PageContext, config: IConfig) {

  const reactRenderDriver = ReactAdaptor(React)
  
  const { distServerRoutes, distEntryJS, distEntryCSS, distServerRoutesCSS } = config.pointFiles

  let entryFunctionModule = (doc: React.ReactElement) => doc
  if (fs.existsSync(distEntryJS)) {
    entryFunctionModule = require(distEntryJS).default
  }
  logFrame(`distServerRoutes:${distServerRoutes}`)
  const routesEntryModule = require(distServerRoutes).default

  const routerLocation = ctx.location

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

    getPlugin('GlobalRunning').setCurrent(scope, wrapCtx(ctx))
    cancelGlobalRunning = () => {
      getPlugin('GlobalRunning').setCurrent(scope, null) 
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

  const css = []
  fs.existsSync(distEntryCSS) && css.push(distEntryCSS)
  fs.existsSync(distServerRoutesCSS) && css.push(distServerRoutesCSS)

  console.log(`[${routerLocation}] is end. second rendering cost ${chalk.blue(cost)} ms \n ---`)

  return {
    driver: reactRenderDriver.driver,
    html,
    html2,
    css,
  }
}
