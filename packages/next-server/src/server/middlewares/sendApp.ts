import Application from "koa";
import { join } from "path";
import { IConfig } from "../../config";
import send from "koa-send";
export default function pureDevCache (args: {
  config: IConfig
}) : Application.Middleware {

 const config = args.config

 return async (ctx, next) => {
   console.log('[sendApp] ctx.request.url: ', ctx.request.url);
  if (ctx.request.url.startsWith('/' + config.appDirectory)) {
    const file = join(config.cwd, '.' + ctx.request.url)
    console.log('[sendApp] file: ', file);
    await send(ctx, file)
  } else {
    await next()
  }
 }
}
