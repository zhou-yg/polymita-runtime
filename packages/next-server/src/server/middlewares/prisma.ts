import Application from "koa";
import { IConfig } from "../../config";
import * as fs from "fs";
import * as path from "path";
import { isBlankObject, logFrame } from "../../util";

/**
 * @TODO should provide by default  
 */
export default function prisma (args: {
  config: IConfig
}) : Application.Middleware {
  const config = args.config

  const prismaClientEntry = path.join(config.cwd, config.model.prismaClientEntry)
  
  /**
   * skip if not exists prisma.client
   */
  if (!fs.existsSync(prismaClientEntry)) {
    return ((ctx, next) => next())
  }

  const client = require(prismaClientEntry)
  const prisma = new client.PrismaClient()

  const connectResult = prisma.$connect();
  
  return async (ctx, next) => {
    ctx.prisma = prisma
    await connectResult
    await next()
  }
}
