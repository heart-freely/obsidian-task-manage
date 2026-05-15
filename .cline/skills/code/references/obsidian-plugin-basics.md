---
name: obsidian-插件开发基础参考
description: Obsidian 插件开发的通用基础指南，包括环境配置、编译流程、API 使用与发布流程。所有视图 Skill 的共享参考。
triggers:
  - 了解 Obsidian 插件开发环境
  - 查询如何注册视图或命令
  - 发布插件新版本
  - 配置 ESLint 与 GitHub Action
---

# Obsidian 插件开发基础参考

## API 文档
Obsidian 插件 API 文档参见：https://docs.obsidian.md

本插件基于 ItemView 架构，通过 `registerView` 注册自定义视图，使用 `addCommand` 添加命令。

## 开发环境
- 确保 NodeJS 版本至少为 v16（`node --version`）
- 克隆仓库后运行 `npm i` 或 `yarn` 安装依赖
- 运行 `npm run dev` 以监视模式启动编译（使用 esbuild）
- 修改 `src/` 下的源码文件，编译后输出 `main.js`
- 重新加载 Obsidian 以加载新版本的插件
- 在设置窗口中启用插件

也可使用 Docker 快速搭建编译环境：
```
docker run -it --rm -v ${PWD}:/app -w /app node:20-bullseye bash
```
手动安装

将 main.js、styles.css、manifest.json 复制到仓库目录 VaultFolder/.obsidian/plugins/你的插件ID/ 下。
注册视图与命令

    注册自定义视图：


this.registerView(VIEW_TYPE, (leaf) => new MyView(leaf));

添加命令：
```javascript

this.addCommand({
  id: 'my-command',
  name: '我的命令',
  callback: () => { /* 执行逻辑 */ }
});
```
发布新版本

    更新 manifest.json 中的版本号和 minAppVersion

    更新 versions.json，添加 "新插件版本": "最低Obsidian版本"

    使用新版本号作为 Tag 创建 GitHub 发布（不含 v 前缀）

    将 manifest.json、main.js、styles.css 作为二进制附件上传

    可通过 npm version patch 等命令简化版本号更新流程

代码质量保障

    本项目使用 ESLint 分析代码，运行 npm run lint 检查

    配合自定义的 eslint-plugin-obsidianmd 使用

    GitHub Action 已预配置，自动对每次提交进行代码检查

资金支持链接

可在 manifest.json 中配置 fundingUrl：
```json

{
  "fundingUrl": "https://buymeacoffee.com"
}
```
或支持多个链接：
```json

{
  "fundingUrl": {
    "Buy Me a Coffee": "https://buymeacoffee.com",
    "GitHub Sponsor": "https://github.com/sponsors",
    "Patreon": "https://www.patreon.com/"
  }
}
```