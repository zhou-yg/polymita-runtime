import { join } from 'path'
import { IConfig } from '../config'
import * as prismaInternals from '@prisma/internals'
import { existsSync, readFileSync } from 'fs'

export async function getPrismaConfig (config: IConfig)  {
  const { cwd } = config
  const schemaFile = join(cwd, config.modelsDirectory, config.targetSchemaPrisma)

  let client: any;
  if (existsSync(schemaFile)) {
    const gen = await prismaInternals.getGenerator({
      schemaPath: schemaFile,
      dataProxy: false
    })
    const output = gen.config.output.value
    client = (require(output))
  } else {
    // make sure import the prisma from current development project
    // @ts-ignore
    client = (await import(join(config.nodeModulesDir, '@prisma/client/index.js')))
  }

  if (!client.PrismaClient) {
    throw new Error('[setPrisma] error, prisma.PrismaClient not found please run prisma generate first')
  }
  const prisma = new client.PrismaClient()
  console.log('prisma.$connect: ', prisma.$connect);
  const connectResult = prisma.$connect();
  connectResult.then(() => {
    console.log('connect success', Object.keys(prisma))
  })

  return ({
    async find(from: string, e, w) {
      console.log('find e: ', e);
      return prisma[e].findMany(w).then(r => r)
    },
    async update(from: string, e, w) {
      console.log('update start: ', e, w);
      const r = prisma[e].update(w)
      await r
      console.log('update end: ', e);
      return r
    },
    async remove(from: string, e, d) {
      return prisma[e].delete(d).then(r => r)
    },
    async create(from: string, e, q) {
      console.log('create start: ', e, q);
      const r = prisma[e].create(q).then(r => r)
      await r
      console.log(`create end:`,e, q)
      return r
    },
    async updateMany(from, entity, query) {
      return prisma[entity].updateMany(query).then(r => r)
    },
    async upsert(from, entity, query) {
      return prisma[entity].upsert(query).then(r => r)
    },
    // should check relation here
    async executeDiff(from: string, e, d) {
      await Promise.all(d.create.map(async obj => {
        await prisma[e].create({
          data: obj.value
        })
      }))
      await Promise.all(d.update.map(async obj => {
        const { source } = obj
        if (source.id === undefined || source.id === null) {
          throw new Error('[update] must with a id')
        }
        await prisma[e].update({
          where: {
            id: source.id
          },
          data: obj.value
        })
      }))
      await Promise.all(d.remove.map(async obj => {
        const { source, value } = obj
        if (value.id === undefined || value.id === null) {
          throw new Error('[remove] must with a id')
        }
        await prisma[e].delete({
          where: {
            id: value.id
          },
        })
      }))
    },
  })
}
