import { spawn } from 'child_process'
import shelljs from 'shelljs'

const { cp } = shelljs;

const instance = spawn('rollup', ['--config', 'rollup.config.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

instance.on('close', () => {
  
  const ejsArr = [
    'src/compiler/prebuild/preset/*.ejs',
    'src/compiler/plugins/*.ejs',
    'src/server/*/*.ejs',
  ]
  const jsArr = [
    'src/server/internalStatic/*.js',
    'src/server/internalStatic/*.map',
    'src/server/internalStatic/dev/*.js',
    'src/server/internalStatic/dev/*.map',
  ]

  ejsArr.forEach(from => {
    cp(from, 'dist/cli/')
    cp(from, 'dist/')  
  })
  jsArr.forEach(from => {
    cp(from, 'dist/internalStatic/')
  })

  console.log('build end')
})
