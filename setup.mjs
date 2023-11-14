/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { default as packageJson } from './package.json' assert { type: 'json' };
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const C = {
  RED: '\x1B[1;31m',
  YELLOW: '\x1B[1;33m',
  BLUE: '\x1B[0;34m',
  PURPLE: '\x1B[1;35m',
  GREEN: '\x1B[0;32m',
  CYAN: '\x1B[0;36m'
};

const SET = '\x1B[0m';

function colorize(s, color) {
  return `${color}${s}${SET}`;
}

function colorizeChanged(changedProps, value, propName) {
  return (changedProps.indexOf(propName) > -1) ? colorize(value, C.YELLOW) : value;
}

function printPreview(changed) {
  console.log(`\n
    ${'Friendly Name:'}   ${colorizeChanged(changed.propsChanged, changed.friendlyName, 'friendlyName')}
    ${'Package Name:'}    ${colorizeChanged(changed.propsChanged, changed.packageName, 'packageName')}
    ${'Package Version:'} ${colorizeChanged(changed.propsChanged, changed.packageVersion, 'packageVersion')}
    ${'Package License:'} ${colorizeChanged(changed.propsChanged, changed.packageLicense, 'packageLicense')}
  `);
}

async function shellExec(command) {
  const exec = promisify(execCb);
  const { error, stdout, stderr, } = await exec(command);
  //console.log(error, stdout, stderr);
  return {
    stdout,
    stderr,
    error
  };
}

async function setupProject(changed, old) {
  var command;

  // package.json // https://docs.npmjs.com/cli/v7/commands/npm-pkg
  command = `npm pkg set name="${changed.packageName}"`;
  await shellExec(command); //const { error, stdout, stderr } =

  // README.md (first-line replace)
  command = `sed -i "1 s/^.*$/# ${changed.friendlyName}/" README.md`;
  await shellExec(command);

  // index.html (search and replace)
  command = `sed -i -e "s:${old.friendlyName}:${changed.friendlyName}:g" public/index.html`;
  await shellExec(command);
}

const readmeTitle = await shellExec('sed "1! d" README.md');
const originalDocument = {
  propsChanged: [],
  friendlyName: readmeTitle.stdout.replace('\n','').replace('#','').trim(),
  packageName: packageJson.name,
  packageVersion: packageJson.version,
  packageLicense: packageJson.license
};
const changedDocument = Object.assign({}, originalDocument);

const rl = readline.createInterface({ input, output });

const steps = {
  start: async (changed, old) => {
    return steps.getFriendlyName(changed, old);
  },
  getFriendlyName: async (changed, old) => {
    printPreview(changed);
    changed.propsChanged.push('friendlyName');
    rl.write(changed.friendlyName);
    const friendlyName = await rl.question(colorize('> Friendly name? (i.e. Project Foo)\n\n', C.GREEN));
    changed.friendlyName = friendlyName || changed.friendlyName;
    return steps.getPackageName(changed, old);
  },
  getPackageName: async (changed, old) => {
    printPreview(changed);
    changed.propsChanged.push('packageName');
    rl.write(changed.packageName);
    const packageName = await rl.question(colorize('> Package name? (i.e. project-foo, @org-foo/project-bar)\n\n', C.GREEN));
    changed.packageName = packageName || changed.packageName;
    return steps.getPackageVersion(changed, old);
  },
  getPackageVersion: async (changed, old) => {
    printPreview(changed);
    changed.propsChanged.push('packageVersion');
    rl.write(changed.packageVersion);
    const packageVersion = await rl.question(colorize('> Package version? (i.e. 1.0.0, 0.0.1)\n\n', C.GREEN));
    changed.packageVersion = packageVersion || changed.packageVersion;
    return steps.getPackageLicense(changed, old);
  },
  getPackageLicense: async (changed, old) => {
    printPreview(changed);
    changed.propsChanged.push('packageLicense');
    rl.write(changed.packageLicense);
    const packageLicense = await rl.question(colorize('> Package license? (i.e. MIT, LGPL, Unlicensed)\n\n', C.GREEN));
    changed.packageLicense = packageLicense || changed.packageLicense;
    return steps.confirm(changed, old);
  },
  confirm: async (changed, old) => {
    printPreview(changed);
    console.log('Please note that your changes have not been validated for NPM rules, semver, etc.\n');
    const confirmed = await rl.question(colorize('> Do the changes above look correct? (y/n/quit)\n\n', C.BLUE));
    if (confirmed.toLocaleLowerCase() === 'y' || confirmed.toLocaleLowerCase() === 'yes') {
      await setupProject(changed, old);
      return steps.end();
    } else if (confirmed.toLocaleLowerCase() === 'quit' ) {
      return steps.end();
    } else {
      return steps.start(changed, old);
    }
  },
  end: async () => {
    console.log('\nSetup is now complete! ✨\n\n');
    rl.close();
  },
};

steps.start(changedDocument, originalDocument);
