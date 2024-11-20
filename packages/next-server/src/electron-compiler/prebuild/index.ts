import fs, { readdirSync } from 'fs';
import * as path from 'path'
import chalk from 'chalk';
import { spawn, execSync } from 'child_process';
import { IConfig } from '../../config';
import { logFrame, traverseDir, tryMkdir } from '../../util';
import { compile } from 'ejs'
import { esbuild } from '../../compiler/bundleUtility';
import { externalModules, generateClientRoutes } from '../../compiler';
import externalGlobals from '../../compiler/plugins/esbuild-globals';

export * from './generate'
export * from './generateMain'

const builderConfigTemplateFile = './builderConfig.ejs'
const builderConfigFilePath = path.join(__dirname, builderConfigTemplateFile)
const builderConfigTemplate = compile(fs.readFileSync(builderConfigFilePath).toString())

export const injectElectronBuilderConfig = (config: IConfig) => {
  // if (config.packageJSON.build) {
  //   return
  // }

  const name = config.packageJSON.name?.replace(/[^a-zA-Z0-9]/gi, '').toLowerCase()
  const newBuilderConfigStr = builderConfigTemplate({
    name,
    appId: `polymita.${name}`,
  })

  const mergedJson = {
    ...config.packageJSON,
    build: JSON.parse(newBuilderConfigStr),
  };

  // Write the merged JSON back to the package.json file
  fs.writeFileSync(config.packageJSONPath, JSON.stringify(mergedJson, null, 2));
}

export const checkNativeDep = (config: IConfig) => {
  const dependencies = config.packageJSON.dependencies

  if (dependencies) {
    const dependenciesKeys = Object.keys(dependencies);
    const nativeDeps = fs
      .readdirSync('node_modules')
      .filter((folder) => fs.existsSync(`node_modules/${folder}/binding.gyp`));
    if (nativeDeps.length === 0) {
      return
    }
    try {
      // Find the reason for why the dependency is installed. If it is installed
      // because of a devDependency then that is okay. Warn when it is installed
      // because of a dependency
      const { dependencies: dependenciesObject } = JSON.parse(
        execSync(`npm ls ${nativeDeps.join(' ')} --json`).toString(),
      );
      const rootDependencies = Object.keys(dependenciesObject);
      const filteredRootDependencies = rootDependencies.filter((rootDependency) =>
        dependenciesKeys.includes(rootDependency),
      );
      if (filteredRootDependencies.length > 0) {
        const plural = filteredRootDependencies.length > 1;
        console.log(`
   ${chalk.whiteBright.bgYellow.bold(
          'Webpack does not work with native dependencies.',
        )}
  ${chalk.bold(filteredRootDependencies.join(', '))} ${plural ? 'are native dependencies' : 'is a native dependency'
          } and should be installed inside of the "./release/app" folder.
   First, uninstall the packages from "./package.json":
  ${chalk.whiteBright.bgGreen.bold('npm uninstall your-package')}
   ${chalk.bold(
            'Then, instead of installing the package to the root "./package.json":',
          )}
  ${chalk.whiteBright.bgRed.bold('npm install your-package')}
   ${chalk.bold('Install the package to "./release/app/package.json"')}
  ${chalk.whiteBright.bgGreen.bold(
            'cd ./release/app && npm install your-package',
          )}
   Read more about native dependencies at:
  ${chalk.bold(
            'https://electron-react-boilerplate.js.org/docs/adding-dependencies/#module-structure',
          )}
   `);
        return
      }
    } catch (e) {
      console.log('Native dependencies could not be checked');
    }
  }
}

// "electron-builder install-app-deps"
export const installAppDeps = async (config: IConfig) => {
  // Execute electron-builder install-app-deps
  logFrame('[installAppDeps]', 'running install-app-deps...');
  return new Promise<void>((resolve, reject) => {
    const installDeps = spawn('npx', ['electron-builder', 'install-app-deps'], { stdio: 'inherit' });
    installDeps.on('error', (e) => {
      console.error('error:', e)
      reject(new Error('install-app-deps failed'));
    })
    installDeps.on('data', (d) => {
      console.log('error:', d)
    })
    installDeps.on('close', (code: number) => {
      if (code !== 0) {
        logFrame('[installAppDeps]', 'install-app-deps failed');
        reject(new Error('install-app-deps failed'));
      } else {
        logFrame('[installAppDeps]', 'install-app-deps completed successfully');
        resolve();
      }
    });
  });
}
/**
 * build main.js for electron
 */
export async function buildApp(c: IConfig) {
  await generateClientRoutes(c)

  const entry = c.pointFiles.app.clientRoutes
  
  await esbuild({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    outfile: c.pointFiles.output.app,
    external: [
      ...Object.keys(externalModules(c.dependencyModules.map(f => f.name))),
    ],
    minify: false,
    define: {
      // 'process.env.HASH_ROUTER': '"true"',
    },
    plugins: [
      externalGlobals(externalModules(c.dependencyModules.map(f => f.name))),
    ],
  })
}

export const generateElectronApp = async (c: IConfig) => {

}

function addDepToPkg (c: IConfig, depPath: string) {
  const pkg = JSON.parse(fs.readFileSync(c.pointFiles.generates.app.pkgJSON).toString())
  // dep package name
  const depPkg = path.join(depPath, 'package.json')
  const depPkgContent = JSON.parse(fs.readFileSync(depPkg).toString())
  
  // ignore electron
  if (depPkgContent.name.startsWith('electron')) {
    return
  }

  const newPkg = {
    ...pkg,
    dependencies: {
      ...pkg.dependencies,
      [depPkgContent.name]: '*',
    },
  }
  
  fs.writeFileSync(c.pointFiles.generates.app.pkgJSON, JSON.stringify(newPkg, null, 2))
}

export const mergePolymitaDeps = (c: IConfig) => {
  const srcPolymitaModulesPath = path.join(c.nodeModulesDir, '@polymita');

  const appPkg = JSON.parse(fs.readFileSync(c.pointFiles.generates.app.pkgJSON).toString())
  /**
   * merge dependencies from root package.json
   */
  Object.assign(appPkg.dependencies, c.packageJSON.dependencies)
  /**
   * merge dependencies from @polymita modules
   */
  readdirSync(srcPolymitaModulesPath).forEach(f => {
    const srcDirPath = path.join(srcPolymitaModulesPath, f, 'package.json')
    const srcPkg = JSON.parse(fs.readFileSync(srcDirPath).toString())
    Object.assign(appPkg.dependencies, srcPkg.dependencies)
  })

  Object.keys(appPkg.dependencies).forEach(name => {
    if (
      name.startsWith('@polymita') ||
      ['electron', 'electron-builder'].includes(name)
    ) {
      delete appPkg.dependencies[name]
    }
  })

  fs.writeFileSync(c.pointFiles.generates.app.pkgJSON, JSON.stringify(appPkg, null, 2))
}
export const linkModules = (c: IConfig) => {
  const srcNodeModulesPath = path.join(c.nodeModulesDir);
  const appNodeModulesPath = path.join(c.pointFiles.generates.app.root, 'node_modules');
  
  // const srcPolymitaModulesPath = path.join(c.nodeModulesDir, '@polymita');
  // const appPolymitaModulesPath = path.join(c.pointFiles.generates.app.root, 'node_modules', '@polymita');
  // const polymitaSubModules = fs.readdirSync(srcPolymitaModulesPath).map(f => [
  //   path.join(srcPolymitaModulesPath, f, 'node_modules'),
  //   path.join(appPolymitaModulesPath, f, 'node_modules'),
  // ]);

  ;[
    [srcNodeModulesPath, appNodeModulesPath],
    // ...polymitaSubModules,
  ].forEach(([srcDirPath, appDirPath]) => {
    traverseDir(srcDirPath, (f) => {
      if (!f.name) {
        return false
      }
  
      const appModulePath = path.join(appDirPath, f.relativeFile)
      if (f.isDir) {
        tryMkdir(appModulePath)
      } else {
        const appModulePath = path.join(appDirPath, f.relativeFile)
        
        if (!fs.existsSync(appModulePath)) {
          fs.symlink(f.path, appModulePath, 'junction', err => {
            if (err) {
              console.error('error:', err)
            }
            addDepToPkg(c, appModulePath)
          });
        } else {
          addDepToPkg(c, appModulePath)
        }
      }
    })
  })

}
