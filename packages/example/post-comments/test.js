const date = new Date()

const p = new Proxy(date, {
  get (t, p) {
    return Reflect.get(t, p).bind(t)
  }
})

const t = p.getTime()
console.log('t: ', t);