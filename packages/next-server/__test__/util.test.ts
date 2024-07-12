import { connectModel } from "../src"

describe('util', () => {
  it ('connectModel', () => {
    const model = connectModel()
    model.use(async (ctx, next) => {
      ctx.a = 1;
      await next()
      ctx.b = 2
    })
    model.use(async (ctx) => {
      expect(ctx.a).toBe(1)
      expect(ctx.b).toBe(undefined)
    })

    model.start()
  })
})