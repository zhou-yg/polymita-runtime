#!/usr/bin/env node
const inquirer = require('inquirer')
const { writeFile, existsSync, mkdir, mkdirSync, rm } = require('node:fs')
const https = require('node:https')
const { join } = require('node:path')
const StreamZip = require('node-stream-zip');
const {} = require('child_process');
const { spawn } = require('node:child_process');

const taratTemplatesZipURL = 'https://codeload.github.com/zhou-yg/tarat-templates/zip/refs/heads/master'

const cwd = process.cwd()

console.log(`cli command in:`, __dirname)
console.log('run in cwd:', cwd);

const cacheZip = join(cwd, './tarat-templates.zip')

const regularManagers = ['pnpm', 'yarn', 'npm']

async function downloadZip () {
  return new Promise((resolve, reject) => {
    https.get(taratTemplatesZipURL, res => {
      const { statusCode } = res
      if (statusCode !== 200) {
        console.error(`Request failed: ${statusCode}`);
        res.resume();
        return;
      }
      let buffers = []
      let size = 0
      res.on('data', (chunk) => {
        buffers.push(chunk)
        size += chunk.length
      })
      res.on('end', () => {
        const result = Buffer.concat(buffers, size)
        writeFile(cacheZip, result, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    })
  })
}

async function create(options) {
  const projectDir = join(cwd, options.name)
  const nodeModulesDir = join(projectDir, 'node_modules')

  await downloadZip()

  const zip = new StreamZip.async({ file: cacheZip })
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir)
  }

  const subDirPath = 'next'

  await zip.extract(`tarat-templates-master/${subDirPath}`, projectDir)
  await zip.close()

  const { installer } = await inquirer
    .prompt([
      {
        name: 'installer',
        message: 'Do you want me to run `install` ?',
        type: 'list',
        choices: ['dont do this', ...regularManagers]
      },
    ])
  if (regularManagers.includes(installer)) {
    const instance = spawn(`${installer}`, ['install'], {
      stdio: ['pipe', process.stdout, process.stderr],
      cwd: projectDir
    })
    instance.on('close', () => {
      if (existsSync(nodeModulesDir)) {
        spawn('npm', ['run', 'p:dev'], {
          stdio: ['pipe', process.stdout, process.stderr],
          cwd: projectDir
        })  
      }
    })
  }
}


inquirer
  .prompt([
    {
      name: 'name',
      message: 'Please input your project name',
      type: 'input',
      default: 'my-tarat-module'
    },
  ]).then(({ lang, name }) => {
    create({ name })
      .finally(() => {
        rm(cacheZip, (err) => {
          if (err) console.error(err)
        })
      })
  })