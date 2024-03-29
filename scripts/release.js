const { cp } = require('shelljs')
const { join, resolve, parse, relative } = require('path')
const { spawn, exec } = require('child_process')
const chalk = require('chalk')
const { existsSync, mkdirSync, readFileSync, fstat, readdirSync, writeFileSync } = require('fs')
const { loadJSON } = require('./utils')

const SHOULD_RELEASE = !!process.env.RELEASE
console.log('SHOULD_RELEASE is', SHOULD_RELEASE, SHOULD_RELEASE ? 'release new version' : 'only build');

const packagesPath = join(__dirname, '../packages/')
const C = join(packagesPath, 'connect')
const R = join(packagesPath, 'renderer')
const S = join(packagesPath, 'signal')
const SM = join(packagesPath, 'signal-model')
const Server = join(packagesPath, 'server')

const PKG = 'package.json'

const [specificModule] = process.argv.slice(2)

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

function publish (cwd) {
  if (specificModule && !(new RegExp(`${specificModule}$`).test(cwd))) {
    console.log(`skip publish ${cwd}`)
    return Promise.resolve()
  }

  return new Promise(resolve => {
    console.log('pnpm publish');
    exec(`pnpm publish --access=public`, { cwd }, (err, stdout) => {
      if (err) {
        throw err
      }
      if (stdout) {
        console.log(stdout);
      }
      resolve()
    })
  })
}

function commit () {
  return new Promise(resolve => {
    console.log('git commit');
    const rootPkgJSONPath = join(__dirname, '..', PKG)
    const pkgJSON = JSON.parse(readFileSync(rootPkgJSONPath).toString())

    pkgJSON.version = pkgJSON.version.replace(/\d+$/, (w) => parseInt(w) + 1)
    writeFileSync(rootPkgJSONPath, JSON.stringify(pkgJSON, null, 2))
  
    exec(`git commit -a -m "release: polymita-runtime ${specificModule || ''} v${pkgJSON.version} "`, (err, stdout) => {
      if (err) {
        throw err
      }
      if (stdout) {
        console.log(stdout);
      }
      resolve()
    })
  })
}

function upgradePatch(dirPath) {
  if (specificModule && !(new RegExp(`${specificModule}$`).test(dirPath))) {
    console.log(`skip upgradePatch ${dirPath}`)
    return Promise.resolve()
  }

  const pkgJSONPath = join(dirPath, 'package.json')
  const pkgJSON = loadJSON(pkgJSONPath)
  pkgJSON.version = pkgJSON.version.replace(/\d+$/, (w) => parseInt(w) + 1)
  writeFileSync(pkgJSONPath, JSON.stringify(pkgJSON, null, 2))
}

Promise.all([
  build(S),
])
  .then(() => (
    build(SM)
  )).then(() => (
    build(R)
  )).then(() => (
    build(C)
  )).then(() => (
    build(Server)
  )).then(async () => {
    if (SHOULD_RELEASE) {
      upgradePatch(S)
      upgradePatch(C)
      upgradePatch(SM)
      upgradePatch(R)
      upgradePatch(Server)

      await commit();

      publish(S)
      publish(C)
      publish(SM)
      publish(R)
      publish(Server)
    }
  });