import { spawn } from 'child_process'
import shelljs from 'shelljs'

const { cp } = shelljs;

const instance = spawn('rollup', ['--config', 'rollup.config.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

instance.on('close', () => {
  
  const ejsArr = [
    'src/compiler/prebuild/preset/signalsMapTemplate.ejs',
    'src/compiler/prebuild/preset/actionsTemplate.ejs',
    'src/compiler/prebuild/preset/hooksTemplate.ejs',
    'src/compiler/prebuild/preset/connectTemplate.ejs',
    'src/compiler/plugins/esbuildLoadViewTemplate.ejs',
  ]

  ejsArr.forEach(from => {
    cp(from, 'dist/cli/')
    cp(from, 'dist/')  
  })

  console.log('build end')
})
