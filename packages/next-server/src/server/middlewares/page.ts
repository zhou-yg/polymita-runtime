import Application from "koa";
import { IConfig } from "../../config";
import { compile } from 'ejs'
import * as fs from 'fs'
import * as path from 'path'
import { ViteDevServer } from "vite";
import { projectRelativePath } from "../../util";
import { exportToGlobalScript } from "../../config/dynamic";

const templateFile = './pageTemplate.ejs'
const templateFilePath = path.join(__dirname, templateFile)

export const pageTemplate = compile(fs.readFileSync(templateFilePath).toString())

const buildPageTemplate = (
  config: IConfig,
  scripts: string[] = []
) => {
  const { entryCSS, clientRoutes } = config.pointFiles.app
  const { app, css: outputCSS } = config.pointFiles.output

  const src = config.isProd ? app : clientRoutes

  const css = config.isProd ? [
    outputCSS
  ] : [
    entryCSS 
  ]
    
  const relativeSrc = projectRelativePath(config, src)

  const html = pageTemplate({
    title: config.app?.title,
    src: relativeSrc,
    css: css.filter(p => fs.existsSync(p)).map(path => projectRelativePath(config, path)),
    ssrHTML: '',
    scripts,
  })

  return html
}

function transformIndexHtml (html: string, c: IConfig) {
  return html
    .replace(
      new RegExp(`href="/${c.buildDirectory}`, 'g'),
      'href="'
    ).replace(
      new RegExp(`src="/${c.buildDirectory}`, 'g'),
      'src="'
    )
}

/**
 * @TODO should provide by default
 */
 export default function page (args: {
   config: IConfig
   vite?: ViteDevServer
}) : Application.Middleware {

  const config = args.config

  return async (ctx, next) => {
    const pathname = ctx.request.path

    if (pathname.startsWith('/api')) {
      return next()
    } else {
      let html = buildPageTemplate(config)

      // console.log('html: ', ctx.request.url, html);
      // use on dev
      if (args.vite && !config.isProd) {
        html = await args.vite.transformIndexHtml(pathname, html)
      } else {
        html = transformIndexHtml(html, config)
      }

      ctx.body = html
    }
  }
}
