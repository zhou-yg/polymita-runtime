import { spawn } from 'child_process'
import shelljs from 'shelljs'

const { cp } = shelljs;

const instance = spawn('rollup', ['--config', 'rollup.config.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

instance.on('close', () => {
  
  cp('src/compiler/prebuild/signalsMapTemplate.ejs', 'dist/cli/')
  cp('src/compiler/prebuild/signalsMapTemplate.ejs', 'dist/')

  console.log('build end')
})
