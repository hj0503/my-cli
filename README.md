### 自定义 cli 脚手架

#### 命令

```js
// 问答形式
crete-dios-cli

// 一步到位
crete-dios-cli my-project --vue3
```

#### 实现思路

##### 下载模版

1、将模版放入脚手架中下载(`create-vue`)

在 `create-dios/template` 文件夹下存放模版代码，模版中包含所有项目初始化代码

- create-dios/template/vue2
- create-dios/template/vue3

执行`crete-dios-cli`命令下载模版代码到当前文件夹

2、从`gerrit`中下载模版(`vue-cli`)(<font color="red">权限问题</font>)

gerrit仓库中存放了相应的模版，通过执行以下命令下载模版

```js
// 使用脚手架中默认地址
crete-dios-cli --gerrit
// 指定地址
crete-dios-cli --gerrit gerrit仓库地址
```


##### 依赖

- minimist/commander

> 命令行参数解析

```js
// --typescript / --ts
npm create dios my-project --ts
```

使用预设参数后，将跳过问题询问，直接拉对应模板到本地

- prompts/nquirer

> 命令行交互

```js
请输入项目名称？ my-project
请输入版本号？ v1.0.0
请为你的项目选择特性？
- Typescript
- Router
- Vuex
- Pinia
```

- gradient-string

> 定制控制台输出样式

- kolorist

> 文字颜色格式化

- download-git-repo/clone-repo

> 下载 git 仓库中的模版

`download-git-repo`支持以下三个仓库源

- Github
- GitLab
- Bitbucket

`clone-repo`支持以下四个仓库源

- GitHub
- GitLab
- Gitee
- Bitbucket

#### 更完善的版本

- 支持选择特性

> 例如：选择是否使用`Typescript`，下载对应 Typescript 模版代码等

把模版拆分

```js
├── template
|  ├── base
|  ├── code
|  ├── config
|  ├── entry
|  ├── eslint
|  └── tsconfig
```
