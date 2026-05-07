
# Skills 索引 — Obsidian 任务管理插件

本技能库为 AI 编程助手（Cline Chinese）提供插件开发所需的上下文信息。所有技能通过 YAML 头部的 `triggers` 字段自动匹配。

## 目录用途

- `code/` – 包含与源代码直接相关的 Skill
- `code/references/` – 只读参考文档
- `code/views/` – 视图 Skill 文件（二级索引：[views.md](code/views/views.md)）
- `sync/` – 自动同步、快照、恢复等维护 Skill
- `snapshots/` – 存放由“保存对话”命令生成的快照文件
- `archive/` – 存放已归档的旧 Skill（对应源码已删除）
- `trash/` – 存放标记为删除的 Skill（待清理）
- `test/` – 预留：测试相关 Skill 或指引

<!-- CACHE_FILES_START -->
## 缓存文件

| 文件 | 用途 | 维护方式 |
|------|------|----------|
| `sync_state.json` | 记录上次同步的 commit hash 和文件修改时间，用于变更检测 | AI 自动读写 |
| `parsed_cache.json` | 缓存源码中解析出的 `@skill-*` 注释位置及校验和 | AI 自动更新 |
| `anchor_cache.json` | 缓存源码中锚点（`@skill-anchor`）的位置 | AI 自动更新 |

> 此区域由 `sync/update-readme.md` 技能自动维护，请勿手动编辑。
<!-- CACHE_FILES_END -->

## 架构技能

| 技能                 | 文件路径                       |
| -------------------- | ------------------------------ |
| 任务管理插件开发架构 | [code/skill.md](code/skill.md) |

## 参考文档（只读）

| 文档                  | 文件路径                                                     |
| --------------------- | ------------------------------------------------------------ |
| Obsidian 插件开发基础 | [code/references/obsidian-plugin-basics.md](code/references/obsidian-plugin-basics.md) |
| Tasks 插件自定义设计  | [code/references/tasks-plugin-design.md](code/references/tasks-plugin-design.md) |

<!-- VIEWS_TABLE_START -->
## 视图技能

| 视图名称 | 技能文件 | 触发词（部分） | 功能简述 |
|----------|----------|----------------|----------|
| *示例* | *example-view.md* | `示例触发词` | *示例描述* |

> 此区域由 `sync/update-readme.md` 技能自动生成，请勿手动编辑。
<!-- VIEWS_TABLE_END -->

<!-- SYNC_TABLE_START -->
## 同步维护技能

| 技能名称 | 文件路径 | 触发词示例（多组） |
|----------|----------|-------------------|
| *示例* | *sync/example.md* | `示例触发词` |

> 此区域由 `sync/update-readme.md` 技能自动生成，请勿手动编辑。
<!-- SYNC_TABLE_END -->

<!-- TRIGGERS_START -->
## 常用触发词速览

| 触发词（或组） | 对应技能 |
|----------------|----------|
| `示例触发词` | 示例技能 |

> 此区域由 `sync/update-readme.md` 技能自动生成，请勿手动编辑。
<!-- TRIGGERS_END -->

> 所有带注释标记的区域（`<!-- XXX_START -->` 至 `<!-- XXX_END -->`）均可由 `sync/update-readme.md` 技能自动更新。静态章节（目录用途、架构技能、参考文档）请人工维护。

