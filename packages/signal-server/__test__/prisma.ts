import * as client from './database/autoPrisma/client'

if (!client.PrismaClient) {
  throw new Error(
    '[setPrisma] error, prisma.PrismaClient not found please run prisma generate first'
  )
}

const prisma = new client.PrismaClient()
prisma.$connect()

export async function clearAll() {
  try {
    const all = await prisma.item.findMany({ where: {} })
    if (all.length > 0) {
      await prisma.item.deleteMany({})
    }
  } catch (e) {
    console.error('clearAll', e)
  }
}

export default prisma
