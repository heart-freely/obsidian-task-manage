# 开发流程

## 工程映射

把当前项目目录“映射”进容器：

```powershell
docker run -it --rm -v ${PWD}:/app -w /app node:20-bullseye bash
```
## 手动编译

```powershell
npm run build
```

## 监听模式
只要这个窗口不关闭，Docker 就会在后台帮你实时监听代码变化，并自动编译。

```powershell
npm run dev
```

## 退出容器
```powershell
exit
```

# 代码结构

```text
src/
├── common.js           // 全局状态、配置、工具函数、持久化、CSS
├── taskEngine.js       // 任务解析、筛选、树构建/排序（与视图无关的核心算法）
├── ui.js               // 左侧任务树、筛选面板、控制面板等 UI 组件
├── charts.js           // 图表数据计算、渲染、缩放、模态
├── views/
│   └── TaskPanelView.js    // 当前的任务面板视图（ItemView 子类）
│   （未来可添加：GanttView.js, CalendarView.js, TableView.js 等）
├── main.js             // 插件入口，注册所有视图、命令、图标

```

# Obsidian 示例插件

这是 Obsidian (https://obsidian.md) 的一个示例插件。

本项目使用 TypeScript 提供类型检查和文档。
该仓库依赖最新插件 API（obsidian.d.ts），采用 TypeScript 定义格式，其中包含描述其功能的 TSDoc 注释。

此示例插件展示了插件 API 的一些基本功能：
- 添加一个功能图标，点击时显示一条通知。
- 添加一个命令“打开模态框（简单）”，用于打开一个模态框。
- 在设置页面添加插件设置选项卡。
- 注册一个全局点击事件，并在控制台输出“click”。
- 注册一个全局时间间隔，在控制台输出“setInterval”。

## 初次开发插件？

面向新插件开发者的快速入门指南：

- 先检查是否[已经有人为你想要的功能开发了插件](https://obsidian.md/plugins)！也许已有足够相似的现有插件，你可以与其合作。
- 使用“Use this template”（使用此模板）按钮将此仓库复制为模板（如果看不到该按钮，请登录 GitHub）。
- 将你的仓库克隆到本地开发文件夹。为了方便，你可以将此文件夹放在你的 `.obsidian/plugins/你的插件名称` 目录下。
- 安装 NodeJS，然后在你的仓库文件夹下的命令行中运行 `npm i`。
- 运行 `npm run dev`，将你的插件从 `main.ts` 编译为 `main.js`。
- 对 `main.ts` 进行修改（或创建新的 `.ts` 文件）。这些修改应自动编译到 `main.js` 中。
- 重新加载 Obsidian 以加载新版本的插件。
- 在设置窗口中启用插件。
- 如需更新 Obsidian API，请在仓库文件夹下的命令行中运行 `npm update`。

## 发布新版本

- 更新你的 `manifest.json`，填入新版本号（例如 `1.0.1`）以及最新版本所需的最低 Obsidian 版本。
- 更新你的 `versions.json` 文件，添加 `"新插件版本": "最低Obsidian版本"`，以便旧版 Obsidian 可以下载兼容的旧版插件。
- 使用你的新版本号作为“Tag version”（标签版本）创建新的 GitHub 发布。请使用确切的版本号，不要包含前缀 `v`。示例参见：https://github.com/obsidianmd/obsidian-sample-plugin/releases
- 将 `manifest.json`、`main.js`、`styles.css` 文件作为二进制附件上传。注意：`manifest.json` 文件必须位于两个位置：仓库的根路径以及发布中。
- 发布该版本。

> 你可以在 `manifest.json` 中手动更新 `minAppVersion` 后，运行 `npm version patch`、`npm version minor` 或 `npm version major` 来简化版本号更新流程。
> 该命令将更新 `manifest.json` 和 `package.json` 中的版本号，并将新版本的条目添加到 `versions.json` 中。

## 将你的插件添加到社区插件列表

- 查阅[插件指南](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)。
- 发布初始版本。
- 确保你的仓库根目录下有一个 `README.md` 文件。
- 在 https://github.com/obsidianmd/obsidian-releases 上提交拉取请求（pull request）以添加你的插件。

## 使用方法

- 克隆此仓库。
- 确保你的 NodeJS 版本至少为 v16（`node --version`）。
- 运行 `npm i` 或 `yarn` 安装依赖。
- 运行 `npm run dev` 以监视模式启动编译。

## 手动安装插件

- 将 `main.js`、`styles.css`、`manifest.json` 复制到你的仓库目录 `VaultFolder/.obsidian/plugins/你的插件ID/` 下。

## 使用 eslint 提高代码质量
- [ESLint](https://eslint.org/) 是一个分析代码以快速发现问题的工具。你可以对插件运行 ESLint 来发现常见错误并改进代码。
- 本项目已经预配置了 eslint，你可以通过运行 `npm run lint` 来调用检查。
- 配合针对 Obsidian 特定代码指南的自定义 eslint [插件](https://github.com/obsidianmd/eslint-plugin) 使用。
- 预配置了一个 GitHub action，自动对所有分支的每次提交进行代码检查。

## 资金支持链接

你可以添加资金支持链接，让使用你插件的人能够通过经济方式支持你。

简单的方法是在你的 `manifest.json` 文件中将 `fundingUrl` 字段设置为你的链接：

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

如果你有多个支持链接，也可以这样写：

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API 文档

参见 https://docs.obsidian.md
