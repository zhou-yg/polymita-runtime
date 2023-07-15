const { cp } = require('shelljs')
const { join, resolve, parse, relative } = require('path')
const { spawn, exec } = require('child_process')
const chalk = require('chalk')
const { existsSync, mkdirSync, readFileSync, fstat, readdirSync, writeFileSync } = require('fs')
const { loadJSON } = require('./utils')

const SHOULD_RELEASE = !!process.env.RELEASE
console.log('SHOULD_RELEASE is', SHOULD_RELEASE, SHOULD_RELEASE ? 'release new version' : 'only build');

const packagesPath = join(__dirname, '../packages/')
const examplesDirPath = join(packagesPath, 'example')

const examplePaths = [
  'cascading-list',
  'file-uploader',
  'markdown-editor',
  'post-comments',
  'user-comments',
  'user-login-system'
].map(f => join(examplesDirPath, f))

const [specificModule] = process.argv.slice(2)

;(async () => {
  for (const dir of examplePaths) {
    await build(dir)
    console.log('build end at dir: ', dir);
  }
})()


function build(cwd) {
  if (specificModule && !(new RegExp(`${specificModule}$`).test(cwd))) {
    console.log(`skip building ${cwd}`)
    return Promise.resolve()
  }

  console.log(`start building ${chalk.green(cwd)} \n`)

  return new Promise((resolve, reject) => {
    const instance = spawn('npm', ['run', 'build'], {
      cwd,
      stdio: [process.stdin, process.stdout, process.stderr]
    })
    instance.on('exit', () => {
      console.log(`\nend building`)

      resolve()
    })
  })
}
function pnpmInstall(cwd) {
  if (specificModule && !(new RegExp(`${specificModule}$`).test(cwd))) {
    console.log(`skip building ${cwd}`)
    return Promise.resolve()
  }

  console.log(`start building ${chalk.green(cwd)} \n`)

  return new Promise((resolve, reject) => {
    const instance = spawn('pnpm', ['i'], {
      cwd,
      stdio: [process.stdin, process.stdout, process.stderr]
    })
    instance.on('exit', () => {
      console.log(`\nend building`)

      resolve()
    })
  })
}
