import { clearPlugins, loadPlugin } from '@polymita/signal-model'
import { join } from 'path'
import * as prismaInternals from '@prisma/internals'
import { existsSync } from 'fs'

/**
 * runtime for "test" command
 */
export async function testServerRuntime(config: {
  schemaFile: string
}) {
  clearPlugins()

  const cookies = new Map()
  
  loadPlugin('cookie', {
    async set(s, k, value) {
      if (typeof value === 'string'){
        cookies.set(k, value)
      }
    },
    async get(s, k): Promise<any> {
      const v = cookies.get(k)
      return v
    },
    clear(s, k) {
      cookies.set(k, '')
    },
  })
  //---
  const { schemaFile } = config

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
    client = (await import(join(cwd, 'node_modules/@prisma/client/index.js')))
  }

  if (!client.PrismaClient) {
    throw new Error('[setPrisma] error, prisma.PrismaClient not found please run prisma generate first')
  }
  const prisma = new client.PrismaClient()
  console.log('prisma.$connect: ', prisma.$connect);
  await prisma.$connect();
  console.log('connect success', Object.keys(prisma))

  loadPlugin('Model', {
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
    async upsert(from, entity, query) {
      return {}
    },
    async updateMany(from, entity, query) {
      return {count: 0}
    },
    async create(from: string, e, q) {
      console.log('create start: ', e, q);
      const r = prisma[e].create(q).then(r => r)
      await r
      console.log(`create end:`,e, q)
      return r
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