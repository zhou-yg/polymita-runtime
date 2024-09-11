import { spawn } from 'child_process'
import shelljs from 'shelljs'

const { cp, mkdir } = shelljs;

const instance = spawn('rollup', ['--config', 'rollup.config.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

instance.on('close', () => {
  
  const ejsArr = [
    'src/compiler/prebuild/preset/*.ejs',
    'src/compiler/plugins/*.ejs',
    'src/electron-compiler/*/*.ejs',
    'src/server/*/*.ejs',
  ]
  const jsArr = [
    'src/server/internalStatic/*.js',
  ]
  const jsArr2 = [
    'src/server/internalStatic/dev/*.js',
  ]

  ejsArr.forEach(from => {
    cp(from, 'dist/cli/')
    cp(from, 'dist/')  
  })

  mkdir('dist/internalStatic/')
  jsArr.forEach(from => {
    cp(from, 'dist/internalStatic/')
  })
  mkdir('dist/internalStatic/dev')
  jsArr2.forEach(from => {
    cp(from, 'dist/internalStatic/dev')
  })

  console.log('build end')
})
