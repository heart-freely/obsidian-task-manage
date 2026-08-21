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

**URL 可达性（审核要求）**：`authorUrl`/`fundingUrl` 必须可访问，审核工具会实际请求并判定 `Manifest URL field is not reachable`。

- `authorUrl` 应指向**实际存在的页面**：个人主页不存在时，改用**公开仓库地址**（如 `https://github.com/<user>/<repo>`）
- `fundingUrl` 仅当赞助页确实启用时填写（如 GitHub Sponsors 未启用会 404），不确定时**删除该字段**

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

### 审核报告结构

Obsidian 插件审核报告分四个段落：**Releases**（发布资产）、**Behavior**（行为）、**Dependencies**（依赖）、**Build verification**（构建一致性）。本插件当前状态：Releases、Behavior（Vault Read）、Dependencies、Build verification 全部 Pass，仅 Behavior 段的 Vault Enumeration 为 Recommendation（非阻断）。

### Releases（发布资产）

| 建议项 | 处理结果 | 做法 |
| :--- | :--- | :--- |
| Missing GitHub artifact attestations | ✅ 已消除 | 在 `.github/workflows/release.yml` 的 Build 之后加 `actions/attest-build-provenance@v2`，`subject-path`/`subject-name` 列出 `main.js`、`styles.css`，`permissions` 需 `id-token: write` + `attestations: write`。签名后审核转为两个 Pass |
| Manifest URL 不可达 | ✅ 已消除 | `authorUrl` 指向不存在的个人主页、`fundingUrl` 指向未启用的赞助页会报 `Manifest URL field is not reachable`。改为公开仓库地址（`https://github.com/<user>/<repo>`），删除不可达的 `fundingUrl` |

### Behavior（行为）

| 建议项 | 处理结果 | 做法 |
| :--- | :--- | :--- |
| Dynamic Code Execution（eval/new Function） | ✅ 已消除 | `import * as echarts from "echarts"` 会打包整个 echarts，其 geo/GeoJSONResource 模块的 parseInput 兜底分支含 `new Function`。改为 `echarts/core` 并按需 `echarts.use([PieChart, BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])` 后 `new Function` 消失，`main.js` 3.59 MB → 1.97 MB（-45%） |
| Vault Enumeration（枚举全部文件） | ⚠️ 固有保留 | 任务插件固有行为：`getMarkdownFiles()` 发现任务文件、`getAllLoadedFiles()` 用于设置文件夹下拉，已由任务文件夹过滤器约束读取范围。审核为 Recommendation（非阻断），且同报 Vault Read: Pass 佐证读取有节制 |

### Code Audit（代码审计）

#### 报错修复

| 规则 | 正确做法 |
| :--- | :--- |
| `no-static-styles-assignment` | 用 CSS 类 + CSS 变量 |
| `no-unsupported-api` | `minAppVersion` 设为最新 API 版本，或替换兼容旧版 API（如 `revealLeaf` → `setActiveLeaf`） |
| `no-innerhtml` | 用 `textContent` 或 DOM API |
| `no-dynamic-style-elements` | 写入 `styles.css`，颜色逐个 `setProperty` |
| `no-html-headings` | `new Setting().setName("标题").setHeading()` |

##### CSS 语法规范

用 CSS 类 + CSS 变量替代 `el.style.xxx`，只改写法不改逻辑，类名统一 `task-` 前缀：

- 静态样式：`el.addClass("task-xxx")`
- 动态样式：`el.addClass("task-dynamic-xxx")` + `el.setCssProps({ "--task-xxx": value })`
- 显隐切换：`el.toggleClass("task-hidden", condition)`

| 原写法 | 替换写法 |
| :--- | :--- |
| `el.style.display = "flex"` | `el.addClass("task-flex")` |
| `el.style.display = "none"` | `el.toggleClass("task-hidden", condition)` |
| `el.style.color = c` | `el.setCssProps({ "--task-color": c })` |

```css
.task-dynamic-bg { background-color: var(--task-bg, var(--background-primary)); }
```

**注意**：甘特图等批量更新样式时，合并同一元素的多个 `setCssProps`，避免多次重排；`style.cssText` 改 CSS 类时注意 `all: unset` 可能被覆盖。

**修复流程**：定位文件+行号 → 分析 → 最小改动 → 编译测试 → 提交验证 → 重复至 Error 清零。

#### 警告消除

##### 可消除的警告

| 修复方法                                               | 是否有效   | 验证依据                                                     |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------ |
| 用接口替代 `any`                                       | ✅ 有效     | `GanttSvgElement`、`EChartsInstance`、`AppLike`、`VaultLike`、`ManageViewLike`、`EditStoreLike`、`TaskViewLike` 等接口应用后，gantt.ts、detail-chart.ts、base-task-view.ts、setting.ts、edit-panel.ts、navigator-utils.ts、task-edit-store.ts 的类型错误已消除；`TaskTreeNode` 添加 `[key: string]: unknown` 索引签名解决动态键访问断言 |
| `querySelector`/`querySelectorAll`/`closest` 改用泛型  | ✅ 有效     | `querySelector<HTMLElement>`、`querySelectorAll<HTMLElement>`、`closest<HTMLElement>` 替代 `as HTMLElement` 断言，消除 gantt.ts、tree-list.ts、sidebar.ts、base-task-view.ts 中的不必要断言 |
| `setTimeout`/`requestAnimationFrame` 加 `window.` 前缀 | ✅ 有效     | 审核结果中无此类报错                                         |
| 删除未使用的变量和函数                                 | ✅ 有效     | `calendar.ts` 删除未使用的 `rowEnd` 变量，警告消除           |
| 空 `catch` 块添加注释说明                              | ✅ 有效     | 审核结果中无 `no-empty` 报错                                 |
| `no-floating-promises` 添加 `void`                     | ✅ 有效     | `time-panel.ts` 中 `void this.render()`、`base-task-view.ts` 中 `void TaskNavigator.openTaskAtLine()`、`void this.store.saveSilent()` 已应用，警告消除 |
| CSS `!important` 移除                                  | ✅ 有效     | 面板按钮、编辑按钮的 `!important` 移除后，通过提高选择器特异性保持样式不丢失 |
| CSS 重复属性合并                                       | ✅ 有效     | `.panel-container-layout` 合并重复的 `padding` 和 `border` 声明 |
| 具体 HTML 元素类型                                     | ✅ 有效     | `HTMLInputElement`、`HTMLSelectElement`、`HTMLAnchorElement` 替代 `HTMLElement` 后，edit-panel.ts、sidebar-panel.ts、base-task-edit.ts 的类型错误已消除 |
| `tsconfig.json` 配置升级                               | ✅ 有效     | `target: "ES2019"`，`lib: ["ES2019", "DOM"]`，`padStart`、`Object.entries`、`trimStart` 全部消除（`trimStart` 是 ES2019 方法，`lib` 停在 ES2018 会使其类型解析失败并传染为 `no-unsafe-*`） |
| 接口类型统一                                           | ✅ 有效     | `TreeFilterOptions.searchText` 从 `string[]` 改为 `string`，`DataManagerLike.loadData` 返回类型与实际实现对齐，`CalendarCacheEntry.dateTaskMap` 统一为 `Map<string, TaskTreeNodeLike[]>`，类型错误消除 |
| 缺失导入                                               | ✅ 有效     | `import logger`、`import { App }` 显式导入后相关隐式 any 错误消除 |
| Plugin 返回类型                                        | ✅ 有效     | `onload(): void` 同步声明，异步逻辑包装在 IIFE 中；`onunload(): void`（不能用 `Promise<void>`，Plugin 基类要求 `void`，否则报 Promise-returning），异步用 `void ...catch(...)` |
| 逗号表达式改为 if-else                                 | ✅ 有效     | `base-task-edit.ts` 中三元运算符逗号表达式改为 if-else 语句块，消除 `Expected an assignment or function call` 警告 |
| `prefer-create-el` 改用 Obsidian 全局 DOM 函数          | ✅ 有效     | `createEl("div")`→`createDiv()`、`createEl("span")`→`createSpan()`（规则对 div/span 有简写建议）；`document.createElement`→全局 `createEl`、`document.createDocumentFragment`→`createFragment()`、`document.createElementNS(svg,…)`→`createSvg(…)`。注意 Obsidian 的 `createEl`/`createDiv`/`createSpan`/`createSvg`/`createFragment` 是 `declare global` 全局函数，**不能 `import { createEl } from "obsidian"`**（运行时报 `createEl is not a function`），应直接调用全局函数 |
| `no-unsafe-*` 类型收窄                                 | ✅ 有效     | `main.ts` 的 `loadData()` 返回 any → `asRecord()` 类型守卫收窄；`detail-chart.ts` 的 `new Array().fill()` → `new Array<number>()`；`md-parser.ts` 的 YAML `value: unknown` → `string`；`intervalMode as IntervalMode` → `normalizeIntervalMode()` 类型守卫替代断言 |
| 多余 `as` 断言删除                                     | ✅ 有效     | `TaskStatus`、`MarkKey` 实际是 `string` 别名（`BaseChildDef.key: string`、`ALL_MARKS: string[]`），`as TaskStatus`、`m as keyof typeof marks` 是 `string as string` 多余断言，直接删除；改用 Obsidian 泛型 `createEl<K>` 返回具体类型后 `as HTMLInputElement` 等也多余 |
| 循环依赖消除                                           | ✅ 有效     | `config.ts` ↔ `setting.ts` 循环依赖会导致 typescript-eslint 类型分析退化。把共享类型（`PathFilterConfig`/`TaskItemFilterConfig`）下沉到 `config.ts` 定义，`setting.ts` 改为 import，消除环 |
| 渲染模块抽独立文件打破循环                             | ✅ 有效     | 页面进度条复用重构时 `progress.ts` ↔ `progress-render.ts` 循环引用，`formatProgressText` 在阅读模式未初始化（TDZ）。把文本格式化抽到独立 `format-text.ts`，两处都从它导入，消除环 |
| `@codemirror/*` 声明到 dependencies                     | ✅ 有效     | esbuild external 的运行时模块（Obsidian 内置提供）也需在 `package.json` 的 `dependencies` 声明，版本与 Obsidian 内置一致（`@codemirror/view` 6.38.6、`@codemirror/state` 6.5.0），消除 "should be listed in the project's dependencies" 警告 |
| 移除 `syntaxTree` 依赖，纯文本跟踪代码块/frontmatter   | ✅ 有效     | `syntaxTree(state).resolveInner()` 因 `@codemirror/language` 类型不完整回退 any，触发 `no-unsafe-call`/`no-unsafe-member-access`。改为循环中维护 `inCodeFence`/`inFrontmatter` 状态（``` ``` ``` 切换围栏、文档开头 `---` 打开第二个 `---` 关闭），`shouldProcess` 加入 `!inCodeFence && !inFrontmatter` 条件，彻底移除 `@codemirror/language` 依赖，同时消除依赖缺失警告 |
| `window.__xxx__` 全局缓存类型化                        | ✅ 有效     | `window.__TASK_READ_TIMERS__` 未声明类型时赋值/读取触发 `no-unsafe-*`。用 `declare global { interface Window { __TASK_READ_TIMERS__?: Record<string, number> } }` 声明 + 显式 `Record<string, number>` 类型化访问，消除警告 |

##### 尝试后无效的方法

| 修复方法                                        | 尝试解决的问题        | 无效原因                                                     |
| ----------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| 显式属性替代 `all: unset`                       | CSS `all: unset` 警告 | 无法完全复制 `all: unset` 的重置效果，编辑按钮高度不一致     |
| `eslint-disable-next-line`                      | Warning 级别警告      | 审核不接受 Warning 级别的禁用注释                            |
| `@ts-expect-error`                              | `no-explicit-any`     | TypeScript 不认可该错误存在                                  |
| 自定义模块级 `createEl`（如 `util/dom-utils.ts`）替代 `document.createElement` | `prefer-create-el` | 无效：审核不认自定义函数。正确做法是直接调用 Obsidian 的全局 DOM 函数（`declare global` 提供，无需 import），并把 `createEl("div"/"span")` 简写为 `createDiv()`/`createSpan()` |
| 双类名提高特异性                                | `!important` 替代方案 | 编辑按钮类名在 TS 代码中动态切换，双类名语法不适用           |
| `this: void` 注解                               | `unbound-method`      | `time-panel.ts` 的两个方法已正确使用箭头函数，审核误报       |

##### 无法消除的警告

| 类别                              | 原因                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `unbound-method`（time-panel.ts） | 审核误报，方法已通过箭头函数回调正确绑定 `this`            |
| `display is deprecated`           | 已用 `display()` 薄包装 + 私有 `renderSettings()` 缓解，保留 `display` 仅为兼容（Recommendation，非阻断） |

### 重构与性能优化

| 改动 | 说明 |
| :--- | :--- |
| 甘特图异步初始化 | `renderGanttWithTree` 通过 `.then()` 异步赋值，修复 `destroy is not a function` 错误 |
| 渲染锁 | `TimePanel` 添加 `isRendering`/`pendingRender` 标志，防止异步渲染竞态 |
| 日历缓存失效 | `calendar.ts` 引入 `CalendarCacheEntry` 结构化缓存，提供 `invalidateCalendarCache()` 函数，在数据变更时调用 |
| 时间轴预计算 | `renderTimeline` 中预计算 `taskRowInfo` Map，避免多行时重复遍历任务列表 |
| 分帧渲染 | `list` 和 `cards` 视图通过 `requestAnimationFrame` 分批渲染（每帧 50 个），缓解大任务量时 UI 阻塞 |
| 删除 nouislider 依赖 | 项目未使用 nouislider，`npm uninstall nouislider`；残留的 `main.css`（nouislider 样式）已从仓库删除，插件样式统一在 `styles.css` |
| Logger 精简 | 删除 `info` 和 `debug` 方法，仅保留 `warn` 和 `error`，消除 `no-console` Error |
| 面板键名统一 | `excut`、`search`、`mark` 合并为 `filter` 面板，减少面板数量至 7 个 |

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
- 插件指南：https://docs.obsidian.md/Plugins 
- 风格指南：https://help.obsidian.md/style-guide