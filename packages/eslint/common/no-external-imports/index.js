// require('./typings.d.ts');
const path = require('path');
const fs = require('fs');

const DEPENDENCIES_VARIANTS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

module.exports = (filenamePath, moduleDependencies) => {
  const dirPath = path.resolve(path.dirname(filenamePath));
  const packageJsonPath = findFilesystemEntity(dirPath, 'package.json');
  if (typeof packageJsonPath !== 'undefined') {
    getDependenciesFromPackageJson(packageJsonPath, moduleDependencies);
  }
  checkDependenciesInNodeModules(dirPath, moduleDependencies);
};

function checkDependenciesInNodeModules(currentFolderPath, packageJsonDependencies) {
  const nodeModulesPath = findFilesystemEntity(currentFolderPath, 'node_modules');
  if (typeof nodeModulesPath !== 'undefined') {
    collectNodeModulesDependencies(nodeModulesPath, packageJsonDependencies);
  }
  if (currentFolderPath !== '/') {
    checkDependenciesInNodeModules(path.dirname(currentFolderPath), packageJsonDependencies);
  }
}

function findFilesystemEntity(current, name) {
  let prev;
  do {
    const fileName = path.join(current, name);
    if (fs.existsSync(fileName)) {
      return fileName;
    }
    prev = current;
    current = path.dirname(current);
  } while (prev !== current);
  {
    return undefined;
  }
}

function collectNodeModulesDependencies(currentPath, packageJsonDependencies) {
  const nodeModulesFolders = fs.readdirSync(currentPath);
  for (const moduleFolder of nodeModulesFolders) {
    const stat = fs.lstatSync(path.join(currentPath, moduleFolder));
    if (packageJsonDependencies.has(moduleFolder)) {
      if (stat.isSymbolicLink()) {
        getDependenciesFromPackageJson(path.join(currentPath, moduleFolder, 'package.json'), packageJsonDependencies);
      }
    }

    if(stat.isDirectory()) {
      const currentPathInDirectory = path.join(currentPath, moduleFolder);
      const nodeModulesFoldersInDirectory = fs.readdirSync(currentPathInDirectory);
      for (const moduleFolder of nodeModulesFoldersInDirectory) {
        const stat = fs.lstatSync(path.join(currentPathInDirectory, moduleFolder));
        if(stat.isSymbolicLink()) {
          const moduleFolderInDirectory = currentPathInDirectory.split('/')[currentPathInDirectory.split('/').length - 1] + "/" + moduleFolder
          if (packageJsonDependencies.has(moduleFolderInDirectory)) {
            getDependenciesFromPackageJson(path.join(currentPath, moduleFolderInDirectory, 'package.json'), packageJsonDependencies);
          }
        }
      }
    }
  }
}

function getDependenciesFromPackageJson(packageJsonPath, moduleDependencies) {
  // don't use require here to avoid caching
  // remove BOM from file content before parsing
  const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8').replace(/^\uFEFF/, ''));
  DEPENDENCIES_VARIANTS.forEach(async dependencyVariant => {
    if (typeof content[dependencyVariant] !== 'undefined') {
      addDependencies(moduleDependencies, content[dependencyVariant]);
    }
  });
}

function addDependencies(moduleDependencies, dependencies) {
  for (const name in dependencies) {
    if (dependencies.hasOwnProperty(name)) {
      moduleDependencies.add(name);
    }
  }
}