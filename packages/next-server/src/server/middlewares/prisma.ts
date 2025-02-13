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

  let connectResult
  let prisma;
  function initPrisma () {
    delete require.cache[require.resolve(prismaClientEntry)]

    const client = require(prismaClientEntry)
    prisma = new client.PrismaClient()
    connectResult = prisma.$connect();  

    return connectResult
  }

  initPrisma()
  
  return async (ctx, next) => {
    ctx.prisma = prisma
    ctx.initPrisma = initPrisma
    await connectResult
    await next()
  }
}
