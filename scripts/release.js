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

function publish () {
  return new Promise(resolve => {
    console.log('npm pulibsh');
    exec(`npm publish`, { cwd: taratModule }, (err, stdout) => {
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
    const taratPkg = JSON.parse(readFileSync(join(taratModule, PKG)).toString())
    exec(`git commit -a -m "release: tarat v${taratPkg.version} "`, (err, stdout) => {
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
  const pkgJSONPath = join(dirPath, 'package.json')
  const pkgJSON = loadJSON(pkgJSONPath)
  pkgJSON.version = pkgJSON.version.replace(/\d+$/, (w) => parseInt(w) + 1)
  writeFileSync(pkgJSONPath, JSON.stringify(pkgJSON, null, 2))
}


console.time('release tarat')

build(S)
  .then(() => {
    return build(SM)
  }).then(() => {
    return build(C)
  }).then(() => {
    if (SHOULD_RELEASE) {
      upgradePatch(S)
      upgradePatch(C)
      upgradePatch(SM)

      commit().then(() => {
        return publish()
      }).then(() => {
        console.timeEnd('release tarat')
      })
    }
  })