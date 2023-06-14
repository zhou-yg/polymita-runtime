import { spawn } from 'child_process'
import shelljs from 'shelljs'

const { cp } = shelljs;

const instance = spawn('rollup', ['--config', 'rollup.config.mjs'], {
  cwd: process.cwd(),
  stdio: ['pipe', process.stdout, process.stderr]
})

instance.on('close', () => {
  
  cp('src/middlewares/pageTemplate.ejs', 'dist/cli/')
  cp('src/middlewares/pageTemplate.ejs', 'dist/')

  cp('src/compiler/routesTemplate.ejs', 'dist/cli/')
  cp('src/compiler/routesTemplate.ejs', 'dist/')
  
  cp('src/compiler/routesClientTemplate.ejs', 'dist/cli/')
  cp('src/compiler/routesClientTemplate.ejs', 'dist/')

  cp('src/compiler/defaultTsconfig.json', 'dist/cli/')
  cp('src/compiler/defaultTsconfig.json', 'dist/')

  console.log('build end')
})
