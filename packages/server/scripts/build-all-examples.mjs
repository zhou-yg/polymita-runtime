import { join, resolve } from 'path'
import { lstatSync, readdirSync } from 'fs'
import { execa } from 'execa'

const example = join('../example/')

const porjects = readdirSync(example)

const forceTail = 'user-comments'

async function runAll (p) {

  await Promise.all(p.map(async (name) => {
    const dir = resolve(example, name)
    if (lstatSync(dir).isDirectory()) {
      try {
        await execa('npm', ['run', 'build'], {
          cwd: resolve(example, name)
        })      
        console.log(`[${name}] build end`)
      } catch (e) {
        console.log('error name:', name)
        throw e
      }
    }
  }))
  
  console.log('----\nrun all end')
}

runAll(
  porjects.filter(n => n !== forceTail)
).then(() => {
  return runAll([forceTail])
}).then(() => {
  console.log('finally end')
})
