import Application from "koa";
import { IConfig } from "../config";
import { compile } from 'ejs'
import * as fs from 'fs'
import * as path from 'path'
import { ViteDevServer } from "vite";
import { IHookContext, RunnerModelScope } from "@polymita/signal-model";
import { IViewConfig, matchRoute } from "../config/routes";
import { renderPage } from "../entries/html";
import { projectRelativePath } from "../util";

const templateFile = './pageTemplate.ejs'
const templateFilePath = path.join(__dirname, templateFile)

const template = compile(fs.readFileSync(templateFilePath).toString())

function transformIndexHtml (html: string, c: IConfig) {
  return html
    .replace(
      new RegExp(`href="/${c.buildDirectory}`, 'g'),
      'href="'
    ).replace(
      new RegExp(`src="/${c.buildDirectory}`, 'g'),
      'href="'
    )
}

/**
 * @TODO should provide by default
 */
 export default function page (args: {
   config: IConfig
   pages: IViewConfig[]
   vite?: ViteDevServer
}) : Application.Middleware {

  const config = args.config

  return async (ctx, next) => {
    const pathname = ctx.request.path
    const viewConfig = matchRoute(args.pages, pathname)
    if (viewConfig) {
      let context: Record<string, IHookContext[]> = {}
      let ssrHTML = ''

      console.log('>> start render page path=', pathname)

      const r = await renderPage(
        args.config,
        ctx,
      );
      if (r) {
        for (const v of r.driver.BMValuesMap) {
          context[v[0]] = v[1].map((scope: RunnerModelScope<any>) => {
            const bc = scope.createBaseContext()
            return bc
          })
        }
        ssrHTML = r.html2
      }

      const { autoGenerateClientRoutes, clientRoutes } = config.pointFiles

      const src = config.isProd ? clientRoutes : autoGenerateClientRoutes

      let html = template({
        title: viewConfig.name,
        hookContextMap: JSON.stringify(context),
        src: projectRelativePath(config, src),
        css: r?.css,
        ssrHTML,
        configJSON: JSON.stringify({
          apiPre: args.config.apiPre,
          diffPath: args.config.diffPath,
        })
      })

      // use on dev
      if (args.vite && !config.isProd) {
        html = await args.vite.transformIndexHtml(pathname, html)
      } else {
        html = transformIndexHtml(html, config)
      }

      ctx.body = html

    } else {
      await next()
    }
  }
}
