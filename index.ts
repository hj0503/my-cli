#!/usr/bin/env node

import * as path from 'node:path'
import minimist from 'minimist'
import prompts from 'prompts'

function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)
}

function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

async function init() {
  const cwd = process.cwd()

  const argv = minimist(process.argv.slice(2), {
    alias: {
      typescript: ['ts'],
      'with-tests': ['tests'],
      router: ['vue-router']
    },
    string: ['_'],
    // all arguments are treated as booleans
    boolean: true,
  })

  let targetDir = argv._[0]
  const defaultProjectName = !targetDir ? 'vue-project' : targetDir

  console.log('1111', argv, targetDir)

  let result: {
    projectName?: string
    packageName?: string
  } = {}

  try {
    result = await prompts([
      {
        name: 'projectName',
        type: targetDir ? null : 'text',
        message: '请输入项目名称：',
        initial: defaultProjectName,
        onState: (state) => (targetDir = String(state.value).trim() || defaultProjectName)
      },
      {
        name: 'packageName',
        type: () => (isValidPackageName(targetDir) ? null : 'text'),
        message: '请输入包名称：',
        initial: () => toValidPackageName(targetDir),
        validate: (dir) => isValidPackageName(dir) || '无效的 package.json 名称'
      },
    ])
  } catch (cancelled) {
    console.log(cancelled)
    process.exit(1)
  }

  const { projectName, packageName = projectName ?? defaultProjectName, } = result

  const root = path.join(cwd, targetDir) // 计算目标文件夹的完整文件路径

  console.log('projectName:', projectName, packageName)
}

init().catch((e) => {
  console.error(e)
})