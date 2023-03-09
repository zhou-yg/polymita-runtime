const fs = require('fs')
const path = require('path')
const { join, resolve, parse, relative } = require('path')
const { existsSync, mkdirSync, readFileSync, fstat, readdirSync, writeFileSync } = require('fs')

function traverseDir (dir, callback) {
  const files = fs.readdirSync(dir)
  files.forEach(f => {
    const p = path.join(dir, f)
    const isDir = fs.lstatSync(p).isDirectory()
    callback({
      isDir,
      dir,
      file: f,
      path: p
    })
    if (isDir) {
      traverseDir(p, callback)
    }
  })
}

exports.traverseDir = traverseDir

function loadJSON(f) {
  return JSON.parse(fs.readFileSync(f).toString())
}

exports.loadJSON = loadJSON
