/**
 * run electron in official releasing version
 */
import { spawn } from 'child_process'
import { setupClient } from './core'
import exitHook from 'exit-hook'

async function startApp () {
  const cwd = process.cwd()

  const instance = spawn(
    'tarat', ['start'], 
    {
      cwd: cwd,
      stdio: ['inherit', 'pipe', 'inherit'] 
    }
  )

  instance.on('exit', () => {
    process.exit()
  })

  instance.stdout.pipe(process.stdout)

  exitHook(() => {
    instance.kill('SIGHUP')
  })

  return new Promise<void>(resolve => {
    instance.stdout.on('data', (e2) => {
      if (e2.toString().includes('connect success')) {
        resolve()
      }
    })
  })
}

function createElectron () {
  const client = setupClient({
    port: 9100,
  })
  client.start()
}
startApp().then(() => new Promise<void>(resolve => setTimeout(() => resolve(), 5000))).then(createElectron)
