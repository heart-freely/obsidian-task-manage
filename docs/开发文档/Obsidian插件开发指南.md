# Obsidian 任务管理插件开发指南

> 本文档适用于 Obsidian 社区插件的开发、调试、发布和维护。所有代码片段均以独立代码块形式呈现，无行内代码。

## 快速导航

- [项目概述](#项目概述)
- [快速入门](#快速入门)
- [环境与工具](#环境与工具)
- [项目结构](#项目结构)
- [命名规范](#命名规范)
- [配置规范](#配置规范)
- [命令与设置](#命令与设置)
- [API 与视图](#api-与视图)
- [测试](#测试)
- [版本发布与社区提交](#版本发布与社区提交)
- [编码惯例与最佳实践](#编码惯例与最佳实践)
- [故障排除](#故障排除)
- [参考文献](#参考文献)

---

## 项目概述

- **目标**：开发 Obsidian 社区插件，使用 TypeScript 编写，由打包器编译为单个文件
- **入口点**：源文件编译为输出文件，由 Obsidian 加载
- **必备发布产物**：主文件、清单文件，以及可选的样式文件

官方示例插件展示了插件 API 的以下基本功能：

- 添加一个功能图标，点击时显示一条通知
- 添加一个命令“打开模态框（简单）”，用于打开一个模态框
- 在设置页面添加插件设置选项卡
- 注册一个全局点击事件，并在控制台输出“click”
- 注册一个全局时间间隔，在控制台输出“setInterval”

---

## 快速入门

本节提供最小开发流程，从下载示例插件到在 Obsidian 中实际测试。

### 步骤 1：复制官方示例仓库

使用 GitHub 上的“Use this template”按钮复制[官方示例仓库](https://github.com/obsidianmd/obsidian-sample-plugin)（需登录 GitHub）。将新仓库克隆到本地开发文件夹。

### 步骤 2：安装依赖并启动编译

在仓库根目录下运行：

```bash
npm install
npm run dev
```

此时 `npm run dev` 会启动监视模式，将 `main.ts` 编译为 `main.js`，并监听文件变化自动重新编译。

### 步骤 3：将插件放入 Obsidian 插件目录

找到你的 Obsidian 仓库（Vault）下的插件文件夹，通常为：

```
<Vault>/.obsidian/plugins/
```

在该目录下创建一个以插件 `id` 命名的文件夹（例如 `my-plugin`），然后将编译生成的 `main.js`、`manifest.json` 以及可选的 `styles.css` 复制进去。

> 注意：`manifest.json` 文件必须同时存在于项目根目录和插件文件夹中。

### 步骤 4：在 Obsidian 中启用插件

1. 打开 Obsidian **设置 → 社区插件**
2. 找到你的插件，点击启用
3. 按 `Ctrl/Cmd + P` 执行“重载插件”命令（或直接重启 Obsidian）

### 步骤 5：验证插件功能

- 如果插件注册了命令，可以在命令面板中看到并执行
- 如果插件添加了图标或视图，应在界面上可见

至此，你已经完成了一个最小插件的开发和测试流程。

---

## 环境与工具

- **Node.js**：推荐 LTS v18+，最低 v16（通过 `node --version` 检查）
- **包管理器**：npm（本项目必须，配置文件 `package.json` 中定义脚本和依赖）
- **打包器**：esbuild（本项目必须，构建脚本 `esbuild.config.mjs` 依赖它）。其他项目也可使用 Rollup 或 webpack，只要将所有外部依赖打包到主文件中即可
- **类型定义**：`obsidian` 包提供 TSDoc 注释描述的 API

**注意**：本示例项目对 npm 和 esbuild 有特定技术依赖。如果从零开始创建插件，可以选择不同的工具，但需要相应地替换构建配置。

### 安装与构建

```bash
npm install          # 安装依赖（也可用 npm i）
npm run dev          # 开发模式：监视编译
npm run build        # 生产构建：一次性输出
```

使用 Docker 快速搭建隔离编译环境（可选）：

```bash
docker run -it --rm -v ${PWD}:/app -w /app node:20-bullseye bash
# 容器内执行 npm install 和 npm run build
```

### 构建工具链细节

- 配置文件：`esbuild.config.mjs`
- 支持环境变量区分开发/生产模式
- 支持 source map，方便调试

### 依赖管理说明

`package.json` 中的关键依赖：

- `obsidian`：类型定义（开发依赖）
- `esbuild`：打包工具
- `typescript`：编译器
- `@types/node`：Node.js 类型

### API 版本兼容性

- 插件通过清单文件中的 `minAppVersion` 声明最低支持的 Obsidian 版本
- 升级 Obsidian API 时，应查阅[官方更新日志](https://docs.obsidian.md/Changelog)，并测试不兼容变更
- **原则**：`minAppVersion` 应设为插件实际使用的最低 API 版本。设得太低可能导致用户遇到缺失功能，设得太高则会拒绝旧版 Obsidian 用户安装

如需更新 Obsidian API 类型定义，运行：

```bash
npm update
```

---

## 项目结构

### 组织多个文件间的代码

- **将代码组织成多个文件**：功能分散到不同模块，避免全部放入一个文件
- 源码放在 `src/` 目录下，入口文件保持简洁，仅关注插件生命周期
- **推荐的文件结构**：

```
src/
  main.ts           # 插件入口，生命周期管理
  settings.ts       # 设置接口与默认值
  commands/         # 命令实现
  ui/               # UI 组件
  utils/            # 工具函数
  types.ts          # TypeScript 类型定义
```

- **不要提交构建产物**：切勿提交 `node_modules/`、`main.js` 或其他生成的文件到版本控制
- 保持插件规模小，避免过大依赖，优先使用浏览器兼容的包
- 生成的输出应放在插件根目录或 `dist/` 下（取决于构建配置）。发布产物必须最终出现在仓库插件文件夹的顶层（`main.js`、`manifest.json`、`styles.css`）

### 常用文件举例

**入口文件**`main.ts`（极简）：

```typescript
import { Plugin } from "obsidian";
import { MySettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands";

export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    registerCommands(this);
  }
}
```

**设置文件** `settings.ts`：

```typescript
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: "",
};
```

**命令注册文件** `commands/index.ts`：

```typescript
import { Plugin } from "obsidian";
import { doSomething } from "./my-command";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "do-something",
    name: "Do something",
    callback: () => doSomething(plugin),
  });
}
```

> 更多代码示例（如添加命令、持久化设置、安全注册监听器）已在[命令与设置](#命令与设置)章节中提供，此处不再重复。

---

## 命名规范

| 类型      | 风格        | 示例                  |
| --------- | ----------- | --------------------- |
| 文件名    | kebab-case  | `quick-button-bar.ts` |
| 类名      | PascalCase  | `TaskManagerView`     |
| 函数/变量 | camelCase   | `getActiveFile`       |
| 常量      | UPPER_SNAKE | `DEFAULT_SETTINGS`    |

---

## 配置规范

### 样式文件

可选的样式文件会被 Obsidian 自动加载。推荐使用 Obsidian 内置的 CSS 变量以适配深浅主题，例如：

```css
.my-class {
  background-color: var(--background-primary);
  color: var(--text-normal);
}
```

### 清单规则

清单文件 `manifest.json` 必须包含以下字段（非详尽）：

- `id`：插件唯一标识（发布后不可更改，应与文件夹名一致）
- `name`：显示名称
- `version`：语义化版本，如 `1.0.0`
- `minAppVersion`：所需最低 Obsidian 版本
- `description`：简短描述
- `isDesktopOnly`：布尔值，是否仅桌面可用

可选字段：`author`、`authorUrl`、`fundingUrl`（字符串或映射）。  
规范验证工具：https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

### 资金支持链接

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

---

## 命令与设置

### 添加命令

所有面向用户的命令都应通过 `this.addCommand` 添加，使用稳定的 ID（发布后不可更改）。

```typescript
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### 持久化设置

如果插件有配置，提供设置标签和合理的默认值。

```typescript
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

### 安全注册监听器

**重要**：必须使用 `this.register*` 系列方法注册事件、DOM 监听器和定时器，否则插件卸载时不会自动清理，造成内存泄漏。

```typescript
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

---

## API 与视图

Obsidian 插件 API 文档：https://docs.obsidian.md

本插件基于 `ItemView` 架构，通过 `registerView` 注册自定义视图。

### 注册视图

```javascript
this.registerView(VIEW_TYPE, (leaf) => new MyView(leaf));
```

---

## 测试

### 手动安装测试

将 `main.js`、`manifest.json`、`styles.css`（如有）复制到：

```
<Vault>/.obsidian/plugins/<plugin-id>/
```

然后在 Obsidian 中执行以下操作：

1. 打开 **设置 → 社区插件**
2. 找到你的插件并启用
3. 按 `Ctrl/Cmd + P` 执行“重载插件”命令（或重启 Obsidian）

### 单元测试

运行以下命令（推荐 Jest 或 Vitest）：

```bash
npm test
```

## 审核

### 审核报错修复

| 规则                          | 正确做法                                                     |
| :---------------------------- | :----------------------------------------------------------- |
| `no-static-styles-assignment` | 用 CSS 类 + CSS 变量方式（见 CSS 语法规范）                  |
| `no-unsupported-api`          | `minAppVersion` 设为使用的最新 API 版本，或替换为兼容旧版的等效 API（如 `workspace.revealLeaf(leaf)` → `workspace.setActiveLeaf(leaf, { focus: true })`） |
| `no-innerhtml`                | 用 `textContent` 或 DOM API                                  |
| `no-dynamic-style-elements`   | 写入 `styles.css`，状态颜色逐个 `setProperty`                |
| `no-html-headings`            | 用 `new Setting().setName("标题").setHeading()`              |

#### CSS 语法规范

用 CSS 类 + CSS 变量替代所有 `el.style.xxx` 直接样式操作，仅替换样式写法，不改变业务逻辑。

| 原则       | 说明                                                         |
| :--------- | :----------------------------------------------------------- |
| 静态样式   | `el.addClass("task-xxx")`                                    |
| 动态样式   | `el.addClass("task-dynamic-xxx")` + `el.setCssProps({ "--task-xxx": value })` |
| 显隐切换   | `el.toggleClass("task-hidden", condition)`                   |
| 类名前缀   | 统一 `task-`，避免冲突                                       |
| 动态值设置 | 用 `setCssProps` 或 `style.setProperty`                      |
| 类操作     | 优先 `addClass` / `removeClass` / `toggleClass`              |

替换示例

| 原写法                      | 替换写法                                   |
| :-------------------------- | :----------------------------------------- |
| `el.style.display = "flex"` | `el.addClass("task-flex")`                 |
| `el.style.display = "none"` | `el.toggleClass("task-hidden", condition)` |
| `el.style.color = c`        | `el.setCssProps({ "--task-color": c })`    |

```typescript
el.addClass("task-dynamic-bg");
el.setCssProps({ "--task-bg": userColor });
```

```css
.task-dynamic-bg { background-color: var(--task-bg, var(--background-primary)); }
```

**高频更新场景注意事项**：甘特图等需要批量更新元素样式的场景，应将同一元素的多个 `setCssProps` 调用合并为一次，避免多次触发浏览器重排导致性能下降。同时 `style.cssText` 改为 CSS 类时需注意 `all: unset` 等全局重置样式可能被覆盖的问题。

**修复流程**：查看审核报错定位文件+行号 → 分析错误类型选择修复方案 → 单文件修改编译测试 → 提交审核确认错误消失 → 重复至所有 Error 清零。



### 审核警告消除

#### 可消除的警告

| 修复方法                                                | 是否有效              | 验证依据                                                     |
| :------------------------------------------------------ | :-------------------- | :----------------------------------------------------------- |
| 用接口替代 `any`                                        | ✅ 有效                | `GanttSvgElement`、`EChartsInstance`、`AppLike`、`VaultLike`、`ManageViewLike`、`EditStoreLike`、`TaskViewLike` 等接口应用后，gantt.ts、detail-chart.ts、base-task-view.ts、setting.ts、edit-panel.ts、navigator-utils.ts、task-edit-store.ts 的类型错误已消除；`TaskTreeNode` 添加 `[key: string]: unknown` 索引签名解决动态键访问断言 |
| `document.createElement` → `createEl`                   | ❌ 无效                | 审核仍报 100+ 处 `prefer-create-el`，审核工具只认 `obsidian` 包的 `createEl`，项目自定义 `createEl` 不被认可。**更正为：无法消除，建议审核时说明项目使用自定义 DOM 工具函数** |
| `setTimeout`/`requestAnimationFrame` 加 `window.` 前缀  | ✅ 有效                | 审核结果中无此类报错                                         |
| 删除未使用的变量和函数                                  | ✅ 有效                | `calendar.ts` 删除未使用的 `rowEnd` 变量，警告消除           |
| 空 `catch` 块添加注释说明                               | ✅ 有效                | 审核结果中无 `no-empty` 报错                                 |
| 移除冗余的 `as` 类型断言                                | ⚠️ 部分有效            | 部分已消除（`querySelector` 改用泛型 `querySelector<HTMLElement>` 可消除部分），但 `as TaskStatus` 等字面量联合类型断言、`marks[m as keyof typeof marks]` 等动态键访问断言无法完全避免 |
| `no-floating-promises` 添加 `void`                      | ✅ 有效                | `time-panel.ts:81` 中 `void this.render()` 已应用，警告消除；`base-task-view.ts:529` 中 `void this.store.saveSilent()` 修复未应用 |
| `this: void` 注解                                       | ✅ 有效                | 方法签名添加 `this: void` 注解可消除 `unbound-method` 警告，修复未应用到 `time-panel.ts:410,514` |
| surrogate pair / combined character 添加 eslint-disable | ✅ 有效                | `dataview-config.ts:7` 添加 `eslint-disable-next-line no-misleading-character-class -- 正则包含 Emoji 组合字符用于匹配任务日期标记图标` 注释可消除 |
| `no-console` 添加 eslint-disable                        | ✅ 有效                | `logger.ts` 中每个 `console.xxx` 添加 `eslint-disable-next-line no-console -- 项目唯一日志工具` 注释，已消除部分，`logger.ts:5` 仍有一处遗漏 |
| CSS `!important` 移除                                   | ✅ 有效                | 审核结果中无 CSS 报错                                        |
| CSS `all: unset` 移除                                   | ✅ 有效                | 审核结果中无 CSS 报错                                        |
| CSS 重复属性合并                                        | ✅ 有效                | 审核结果中无 CSS 报错                                        |
| `substr` → `substring`                                  | ✅ 有效                | 审核结果中无此报错                                           |
| `getSettingDefinitions()` 替代 `display`                | ⚠️ 仍报 Recommendation | `display` 方法保留，`getSettingDefinitions()` 已实现，报 Recommendation 但不影响审核通过 |
| 具体 HTML 元素类型                                      | ✅ 有效                | `HTMLInputElement`、`HTMLSelectElement`、`HTMLAnchorElement` 替代 `HTMLElement` 后，edit-panel.ts、sidebar-panel.ts、base-task-edit.ts 的类型错误已消除 |
| `tsconfig.json` 配置升级                                | ✅ 有效                | `target: "ES6"` → `"ES2018"`，`lib: ["ES2018", "DOM"]`，`padStart`、`Object.entries` 全部消除 |
| 接口类型统一                                            | ✅ 有效                | `TreeFilterOptions.searchText` 从 `string[]` 改为 `string`，`DataManagerLike.loadData` 返回类型与实际实现对齐，`CalendarCacheEntry.dateTaskMap` 统一为 `Map<string, TaskTreeNodeLike[]>`，类型错误消除 |
| 缺失导入                                                | ✅ 有效                | `import logger`、`import { App }` 显式导入后相关隐式 any 错误消除 |
| `@ts-expect-error` 替代 `any`                           | ✅ 有效                | `setting.ts:81` 中 `plugin as any` 改为 `@ts-expect-error` 配合说明注释，消除 `no-explicit-any` 错误（如 TypeScript 版本兼容导致 `@ts-expect-error` 未使用，则直接移除并正常调用） |
| 逗号表达式改为 if-else                                  | ✅ 有效                | `base-task-edit.ts:638` 中三元运算符逗号表达式改为 if-else 语句块，消除 `Expected an assignment or function call` 警告 |
| `main.ts` 类型守卫                                      | ⚠️ 部分有效            | `this.loadData()` 返回 `unknown`，添加 `typeof` 类型守卫后可减少部分 `unsafe-assignment`，但 Obsidian API 本质返回 `unknown`，无法完全消除 |

#### 无法消除的警告

| 类别                      | 原因                                                         |
| :------------------------ | :----------------------------------------------------------- |
| `no-unsafe-call`          | `Record<string, unknown>` 动态属性调用：`config.ts` 中 `TASK_ELEMENTS` 遍历构建颜色映射；`tasks-config.ts` 中 `TASKS_RX` 正则构建；`task-parser.ts` 中 YAML 字段动态映射；`md-parser.ts` 中 YAML 解析 `yamlData[key] = value` 动态赋值；Obsidian `vault.process` 回调 |
| `no-unsafe-member-access` | YAML 解析返回 `Record<string, unknown>` 的动态键访问：`md-parser.ts` 中 frontmatter 字段访问；配置映射的动态键访问：`config.ts` 中 `STATUS_COLOR_DEFS[c.key]`；浏览器 DOM API 返回值 |
| `no-unsafe-assignment`    | 动态属性赋值给变量：`md-parser.ts` 中 `yamlData[key] = value`；第三方库返回值类型推断不足：`main.ts` 中 `this.loadData()` 返回 `Promise<unknown>` |
| `no-unsafe-argument`      | `unknown` 类型传入回调参数：`task-editor.ts` 中 `app.vault.process(file, fn)` 回调参数；Obsidian API 参数类型无法覆盖 |
| `no-unsafe-return`        | 函数返回 `Record<string, unknown>` 类型：`md-parser.ts` 中 `parseFrontmatter()` 返回 YAML 解析结果；`color-utils.ts` 中 `rgbaToSolidOnDark()` 颜色计算 |
| 必要类型断言              | `as TaskStatus` 类型收窄：`tasks-parser.ts` 中 `SYMBOL_TO_STATUS` 字符串到字面量联合类型转换；`as unknown as` 跨模块转换：`edit-panel.ts` 中 `store.getEditStore()` 类型适配；`marks[m as keyof typeof marks]` 动态键访问 |
| `prefer-create-el`        | 审核工具只认 `obsidian` 包的 `createEl`，项目使用自定义 DOM 工具函数 `src/util/dom-utils.ts`，约 100+ 处无法通过审核 |

### 对源代码的影响

#### 影响范围

| 类别         | 影响           | 说明                                                        |
| :----------- | :------------- | :---------------------------------------------------------- |
| **样式写法** | 替换，功能不变 | `el.style.xxx` → CSS 类 + `setCssProps`，视觉效果一致       |
| **存储方式** | 替换，功能不变 | `localStorage` → `loadData/saveData` + 内存缓存，数据不丢失 |
| **弹窗方式** | 替换，功能不变 | `alert` → `new Notice`，提示效果一致                        |
| **API 兼容** | 替换，功能不变 | `revealLeaf` → `setActiveLeaf`，行为一致                    |
| **业务逻辑** | 零影响         | 所有修改仅改变实现方式，不改变功能                          |

#### 修改原则

```
if (原代码能用且通过审核) {
    不修改;
} else {
    用最小改动达到审核要求;
    不改业务逻辑;
    不引入新依赖;
    修改后编译 + 功能测试;
}
```

## 版本发布与社区提交

### 版本发布流程

1. 更新清单文件中的 `version` 和 `minAppVersion`
2. 更新 `versions.json`，添加 `"新版本": "最低Obsidian版本"`，以便旧版 Obsidian 可下载兼容的旧版插件
3. 使用不含 `v` 前缀的版本号作为 Git Tag 创建 GitHub Release（示例：[obsidian-sample-plugin/releases](https://github.com/obsidianmd/obsidian-sample-plugin/releases)）
4. 将 `manifest.json`、`main.js`、`styles.css` 作为二进制附件上传（注意：清单文件必须同时存在于仓库根目录和发布附件中）
5. 发布该版本

简化版本号更新命令：

```bash
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0
```

这些命令会自动更新清单文件和 `package.json` 中的版本号，并添加条目到 `versions.json`。

### 添加到社区插件列表

- 阅读[插件指南](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- 发布初始版本
- 确保仓库根目录包含 `README.md`
- 在 [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) 提交 Pull Request

---

## 编码惯例与最佳实践

- TypeScript，开启严格模式 `"strict": true`
- **保持入口文件简洁**：`main.ts` 只处理插件生命周期（`onload`、`onunload`、命令注册），所有特性逻辑委托给不同模块
- **拆分大文件**：单个文件超过 200‑300 行时，拆分为更小的模块
- **明确模块边界**：每个文件应有单一、明确的职责
- **打包为一个文件**：将所有代码打包成单个输出文件（不拆分运行时依赖）
- **移动端兼容**：如需支持移动端，避免使用 Node/Electron API，否则设置 `isDesktopOnly: true`
- **异步处理**：优先使用 `async/await`，并妥善捕获错误

### 异步错误处理示例

```typescript
try {
  await this.saveData(this.settings);
  new Notice("设置已保存");
} catch (error) {
  new Notice("保存设置失败");
  console.error(error);
}
```

### 最佳实践与禁忌

**该做**：

- 添加带有稳定 ID 的命令（发布后不要重命名）
- 在设置中提供默认值和验证
- 编写幂等代码路径，避免重载/卸载时漏出监听器或间隔
- 用 `this.register*` 辅助函数清理所有需要清理的资源

**不要**：

- 在没有明显用户面理由和文档的情况下引入网络调用
- 发布需要云服务但未明确披露且未选择加入的功能
- 除非必要且获同意，否则存储或传输仓库内容

### 错误处理与日志

- 生产环境使用 `console.debug` 记录调试信息，避免过多输出
- 错误使用 `console.error` 输出并包含上下文信息
- 对于异步操作，统一使用 `try/catch` 并反馈给用户

### 国际化（i18n）

若需要多语言支持，可添加 `locales/` 目录，使用 `moment.locale()` 或自定义翻译映射。

### CI/CD 流程

项目已配置 GitHub Actions：

- 每次推送自动运行代码检查和单元测试
- 创建 Release 时自动打包附件

---

## 故障排除

### 常见陷阱提醒

- **忘记注册命令或视图**：检查 `onload` 中是否调用了 `this.addCommand` 或 `this.registerView`
- **使用 Node.js 模块但未设置桌面专属**：若代码中使用了 `fs`、`path` 等 Electron 模块，必须在清单中设置 `isDesktopOnly: true`，否则移动端加载失败
- **异步操作后 UI 未更新**：如果涉及视图内容变更，可能需要调用 `app.workspace.requestLayout()`
- **内存泄漏**：直接使用 `window.addEventListener` 或 `setInterval` 而不通过 `register*` 清理，会导致插件重载后事件重复绑定

### 具体问题排查表

| 问题                     | 常见原因                                   | 解决方法                                                     |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| 插件在构建后无法加载     | 输出文件或清单文件位置错误                 | 确认文件位于 `<Vault>/.obsidian/plugins/<plugin-id>/` 顶层   |
| 构建后缺少输出文件       | TypeScript 语法错误或依赖缺失              | 运行 `npm run build` 或 `npm run dev` 查看详细错误           |
| 命令未出现在命令面板     | 未调用 `addCommand` 或命令 ID 重复         | 检查插件 `onload` 中是否正确注册，确保 ID 唯一               |
| 设置修改后重启插件又恢复 | 忘记调用 `saveData` 或异步时序错误         | 设置变更后必须 `await this.saveData(this.settings)`          |
| 移动端异常或插件无法启用 | 使用了仅桌面的 API（如 `fs`）              | 检查代码，将不兼容逻辑放入条件判断或设置 `isDesktopOnly: true` |
| 重载插件后事件执行两次   | 未使用 `registerEvent`，导致旧监听器未清理 | 改用 `this.registerEvent` 等方法注册                         |

---

## 参考文献

- Obsidian 样本插件：[obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- API 文档：https://docs.obsidian.md
- 开发者政策：https://docs.obsidian.md/Developer+policies
- 插件指南：https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- 风格指南：https://help.obsidian.md/style-guide