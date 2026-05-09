---
name: 更新skills
description: 基于 skills-index.json 生成 skills.md 中的project文件树、skills文件树、双向同步触发词列表以及生成配置与缓存文件表。若 autoUpdateIndex 为 true 且索引缺失，自动调用 update-index.md。
triggers:
  - 更新skills|刷新skills|同步skills|生成skills
descriptions:
  - 更新项目文件索引和skills文件索引
---

# 更新skills Skill

## 最高优先级

- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 功能

根据 `.cline/skills/skills-index.json`（若不存在且 `autoUpdateIndex` 为 `true`，则自动调用 `update-index.md` 生成）更新 `.cline/skills/skills.md` ，不存在文件则创建，存在则在已有内容的基础上更新。

## 流程

### 读取.cline\skills\skills

更新前首先检查`.cline\skills\skills.md`是否存在，不存在则创建，存在则在已有内容的基础上更新。

### 读取.cline/skills/sync/sync_config.json

1. **读取配置**：从 `.cline/skills/sync/sync_config.json` 读取 `autoUpdateIndex`（默认为 `true`）。

### 读取.cline\skills\skills-index.json

- 若 `skills-index.json` 存在，直接使用。

- 若不存在且 `autoUpdateIndex` 为 `true`：调用 `sync/update-index.md` 生成索引（静默或提示用户确认）。若生成失败，输出错误并退出。

- 若不存在且 `autoUpdateIndex` 为 `false`：提示用户运行 `更新技能索引` 后重试。

### 更新.cline\skills\skills.md内容

更新前首先检查预设格式是否存在在，不存在则创建，存在则在已有内容的基础上更新。

1. **定位 README 动态区域**：读取现有 `.cline\skills\skills.md`，找到注释标记的行。
2. 修改需要更新的段落，替换标记之间的内容（保留标记本身）。
3. **输出预览**，显示将要替换的段落内容，用户确认后写入。

### 更新project文件树

根据前面读取的.cline/skills/skills-index.json获取project文件树信息

- 生成project文件树

  - 忽略所有以点开头的文件夹，如：.cline,.github.vscode

  - 忽略所有以点开头的文件，如：.clineignore,.editorconfig.gitignore,.npmrc

  - 忽略所有.config配置文件，如：jest.config.js,jest.setup.js

  - 忽略所有编译临时文件，如：obsidian-task-manage\main.js

  - 忽略所有环境配置文件，如：node_modules

  - 忽略所有脚本文件，如：scripts


以下为模板示例

````markdown
<!-- SYNC_PROJECT_START -->

# project文件树

```text
root/
├── main.js                         # 构建产物
├── manifest.json                   # 插件清单
├── styles.css                      # 全局样式
├── src/
│   ├── main.js                     # 插件入口：注册所有视图、命令，启动数据加载
│   ├── configs/
│   │   └── plugin-configs.js       # 全局常量：文件夹路径
│   ├── panel/
│   │   ├── panel.js                # 导航中心 ItemView：
│   │   ├── bars/                   # UI 按钮栏组件
│   │   │   ├── date-botton-bar.js     # 日期级联选择器（年/季/月/周/日）
│   │   │   ├── hide-botton-bar.js     # 筛选面板与任务树的显示/隐藏
│   │   ├── components/
│   │   │   └── tree-view-components.js # 可复用的任务树组件
│   │   ├── interacts/
│   │   │   ├── chart-interact.js      # 图表缩放/拖拽交互
│   │   │   └── tooltip-interact.js    # 通用 Tooltip 管理器
│   │   └── views/                     # 所有子视图（均继承 BaseTaskView）
│   │       ├── base-task-view.js
│   ├── echarts/
│   │   └── echarts.js                 # ECharts 本地封装
│   └── utils/
│       └── logger.js                  # 日志工具（生产环境静默）
└── skills/                            # AI 开发引用文件（本项目知识库）
```

<!-- SYNC_PROJECT_END -->
````

### 更新skills文件树

根据前面读取的.cline/skills/skills-index.json获取skills文件树信息

生成skills文件树

以下为模板示例

````markdown
<!-- SYNC_FILES_START -->

# skills文件树

```text
root/
├── archive                        # 注释
├── code
├── snapshots
├── sync
│   ├── update-index.md            # 注释
├── ...
├── skills.md
├── skills-index.json
```

<!-- SYNC_FILES_END -->
````

### 更新双向同步触发词列表

根据前面读取的.cline/skills/skills-index.json获取触发词信息

1. **读取索引**：解析 `skills-index.json`，获取所有技能的元数据。

   - 遍历skills-index.json中的所有"category"找出含有路径`sync`的项。
       - 对于每个项
           - 如果存在 `triggerGroups` 字段且不为空，则：
               - 输出一行：`{path的文件名部分}`

           - 对每个 `triggerGroup`，输出一行：`执行触发词操作：{将 triggers 字段中的 `|` 替换为“ 或 ”}（{description}）（{path}）`

2. 生成技能触发词列表

   - 不同文件的技能之间用`## {path的文件名部分}`分隔。

   - 每一行触发词使用纯文本，不要带MD标记

3. 注意：只输出那些有操作描述的技能（即 YAML 中定义了 `descriptions` 的技能），视图技能等没有描述的不输出。


以下为模板示例

```markdown
<!-- SYNC_FILES_START -->

# 双向同步技能触发词列表

## update-code.md

执行触发词操作：更新技能 或 同步技能（增量正向同步）（.cline/skills/sync/update-code.md）
执行触发词操作：全局同步技能（全量正向同步 + 结构对齐 + 索引刷新）（.cline/skills/sync/update-code.md）
执行触发词操作：检查功能实现 或 功能校验（功能校验）（.cline/skills/sync/update-code.md）

## update-code.md

...

## update-check.md

...

## update-comment.md

...

<!-- SYNC_FILES_END -->
```

### 更新配置与缓存文件表

- 直接输出固定内容（这些文件路径和用途稳定，无需动态读取）：

```markdown
| 文件                      | 用途                                                   | 维护方式         |
| ------------------------- | ------------------------------------------------------ | ---------------- |
| `skills-index.json`       | 所有技能的元数据（路径、名称、触发词、版本、修改时间） | AI 自动生成/更新 |
| `sync/sync_config.json`   | 同步行为的配置（仲裁规则、自动快照、索引更新等）       | 人工手动编辑     |
| `snapshots/index.json`    | 快照文件的索引（文件名、时间戳、主题、决策）           | AI 自动维护      |
| `cache/sync_state.json`   | 上次同步状态的记录（commit hash、文件 mtime）          | AI 自动读写      |
| `cache/parsed_cache.json` | 源码中 `@skill-*` 注释的解析结果缓存                   | AI 自动更新      |
| `cache/anchor_cache.json` | 源码中锚点（`@skill-anchor`）的位置缓存                | AI 自动更新      |
```

## 配置项（`.cline/skills/sync/sync_config.json`）

```json
{
	"autoUpdateIndex": true
}
```

## 协作说明

- 依赖 `update-index.md` 生成的索引文件。
- 不直接修改 Skill 文件，只更新 skills.md。
- 建议在全量同步后自动调用。
