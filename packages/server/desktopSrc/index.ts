import { spawn } from 'child_process'
import * as desktop from './desktop'
import { IConfig, resolveLib } from '../src'


export async function createDevClient (c: IConfig) {
  const desktopEntry = resolveLib(c.cwd, 'desktop.js')
  console.log('desktopEntry: ', desktopEntry);

  const instance = spawn(
    'npx',
    ['electron', desktopEntry], 
    {
      cwd: c.cwd,
      env: {
        ...process.env,
        RUN_MODE: 'development'
      },
      stdio: ['pipe', process.stdout, process.stderr]
    }
  )

  const data = JSON.stringify({
    type: 'config',
    data: c
  }, null, 2)

  instance.stdin.write(data, () => {
    instance.stdin.end()
  })

  instance.on('exit', () => {
    process.exit()
  })
}
