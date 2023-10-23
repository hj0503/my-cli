#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'

import minimist from 'minimist'
import prompts from 'prompts'
import { postOrderDirectoryTraverse } from './utils/directoryTraverse'
import renderTemplate from './utils/renderTemplate'

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

function canSkipEmptying(dir: string) {
  if (!fs.existsSync(dir)) {
    return true
  }

  const files = fs.readdirSync(dir)
  if (files.length === 0) {
    return true
  }
  if (files.length === 1 && files[0] === '.git') {
    return true
  }

  return false
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return
  }

  postOrderDirectoryTraverse(
    dir,
    (dir: string) => fs.rmdirSync(dir),
    (file: string) => fs.unlinkSync(file)
  )
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

  const forceOverwrite = argv // 是否强制覆盖

  console.log('1111', argv, targetDir)

  let result: {
    projectName?: string
    packageName?: string
    shouldOverwrite?: boolean
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
        name: 'shouldOverwrite',
        type: () => (canSkipEmptying(targetDir) || forceOverwrite ? null : 'toggle'),
        message: () => {
          const dirForPrompt =
            targetDir === '.'
              ? '当前目录'
              : `目标文件夹 "${targetDir}"`

          return `${dirForPrompt} 非空，是否覆盖？`
        },
        initial: true,
        active: '是',
        inactive: '否'
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

  const { projectName, shouldOverwrite, packageName = projectName ?? defaultProjectName, } = result

  const root = path.join(cwd, targetDir) // 计算目标文件夹的完整文件路径

  // 读取目标文件夹状态，看该文件夹是否是一个已存在文件夹，是否需要覆盖
  // 文件夹存在，则清空，文件夹不存在，则创建
  if (fs.existsSync(root) && shouldOverwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }
  // 一句提示, 脚手架项目在xxx目录
  console.log(`\nScaffolding project in ${root}...`)

  // 计算模板所在文件加路径
  const templateRoot = path.resolve(__dirname, 'template')
  // 定义模板渲染 render 方法，参数为模板名
  const render = function render(templateName: string) {
    const templateDir = path.resolve(templateRoot, templateName)
    // 核心是这个 renderTemplate 方法，第一个参数是源文件夹目录，第二个参数是目标文件夹目录
    renderTemplate(templateDir, root)
  }

  render('vue3')
}

init().catch((e) => {
  console.error(e)
})