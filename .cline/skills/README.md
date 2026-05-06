
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

## 架构技能

| 技能                 | 文件路径                       |
| -------------------- | ------------------------------ |
| 任务管理插件开发架构 | [code/skill.md](code/skill.md) |

## 参考文档（只读）

| 文档                  | 文件路径                                                     |
| --------------------- | ------------------------------------------------------------ |
| Obsidian 插件开发基础 | [code/references/obsidian-plugin-basics.md](code/references/obsidian-plugin-basics.md) |
| Tasks 插件自定义设计  | [code/references/tasks-plugin-design.md](code/references/tasks-plugin-design.md) |

## 视图技能

所有视图 Skill 与触发词如下：

- 本文件列出所有视图技能，方便 AI 快速定位。每个技能文件对应一个视图源码文件。

  | 视图名称     | 技能文件                | 触发词（部分）                  | 功能简述                                                     |
  | ------------ | ----------------------- | ------------------------------- | ------------------------------------------------------------ |
  | 基类视图     | base-task-view.md       | `修改任务卡片` `调整数据标准化` | 提供 `BaseTaskView`、`createTaskCard`、`normalizeTaskCardData` |
  | 通用列表工厂 | base-list-view.md       | `创建列表视图` `修改列表工厂`   | 快速构建简单列表视图的工厂函数                               |
  | 通用表格工厂 | base-table-view.md      | `创建表格视图` `修改表格工厂`   | 快速构建表格式视图的工厂函数                                 |
  | 收集箱       | inbox-task-view.md      | `修改收件箱` `调整任务收集`     | 汇聚未开始与计划中任务，排除循环                             |
  | 看板         | kanban-task-view.md     | `修改看板` `添加看板列`         | 三列状态看板（未开始/计划中/进行中）                         |
  | 四象限矩阵   | matrix-task-view.md     | `修改象限` `调整四象限`         | 艾森豪威尔矩阵，按优先级分区                                 |
  | 日历         | calendar-task-view.md   | `修改日历` `调整日历交集`       | 日/周/月/季/年视图，任务与时间段交集                         |
  | 甘特图       | gantt-task-view.md      | `修改甘特图` `调整依赖箭头`     | Canvas 甘特图，依赖关系，虚拟滚动                            |
  | 整理箱       | organize-task-view.md   | `修改整理箱` `调整编辑预览`     | 多级筛选、标记批量编辑、快照撤回                             |
  | 统计分析     | data-tasks-view.md      | `修改统计图表` `添加统计维度`   | 任务树与 ECharts 联动，下钻统计                              |
  | 今天任务     | today-task-view.md      | `修改今天任务` `调整日期过滤`   | 筛选与今天相关的所有未完成/循环任务                          |
  | 逾期任务     | overdue-task-view.md    | `修改逾期视图` `调整逾期判定`   | 截止日期已过的未完成非循环任务                               |
  | 未来 N 天    | future-task-n-view.md   | `修改未来15天` `调整时间窗口`   | 未来 15 天内（含）有交集的未完成非循环任务                   |
  | 全部未来任务 | future-task-all-view.md | `修改全部未来` `调整未来范围`   | 今天之后所有未完成非循环任务                                 |
  | 循环任务     | recurring-task-view.md  | `修改循环视图` `调整周期分组`   | 按优先级-周期-文件三级分组展示循环任务                       |
  | 重要任务     | important-task-view.md  | `修改重要任务` `调整优先级阈值` | 未完成且优先级为最高/高/中的任务                             |
  | 时间线       | timeline-task-view.md   | `修改时间线` `调整截止分组`     | 按截止日期-状态分组，无日期任务置底                          |
  | 所有任务表   | table-task-view.md      | `修改任务表` `调整多级分组`     | 所有任务的状态-计划日期-优先级三级嵌套表格                   |
  | 标签聚合     | tag-task-view.md        | `修改标签视图` `调整标签筛选`   | 按 🏁 标签分组展示任务                                        |
  | 依赖任务     | depends-task-view.md    | `修改依赖视图` `调整依赖解析`   | 展示 🆔 与 ⛔ 依赖关系                                         |
  | 单任务编辑   | edit-tasks-view.md      | `修改单任务编辑` `调整编辑界面` | 直接文本编辑单个任务并写回文件                               |
  | 任务树       | tree-task-view.md       | `修改任务树` `调整父子关系`     | 基于 YAML / Wiki 链接构建父子任务树                          |
  | 番茄钟       | pomodoro-task-view.md   | `修改番茄钟` `调整计时`         | 简单番茄钟计时器，关联任务                                   |
  | 通用视图列表 | view-list-tasks.md      | `修改视图列表` `调整通用渲染`   | 通用任务列表渲染组件                                         |

  > 每个技能文件的完整 YAML 头部位于文件顶部，AI 可直接读取。

## 同步维护技能

| 技能                           | 文件路径                                             | 触发词示例（多组用 `|` 分隔）                                |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------ |
| 快照管理（保存/清理/恢复）     | [sync/update-snapshots.md](sync/update-snapshots.md) | `保存对话` `生成快照` \| `清理快照` `删除旧快照` \| `恢复对话` `加载快照` |
| 更新技能（同步代码到技能文件） | [sync/update-skill.md](sync/update-skill.md)         | `更新技能` `同步技能` `全局同步`                             |
| 代码注释规范                   | [sync/update-comment.md](sync/update-comment.md)     | `注释规范` `如何写注释`                                      |

## 常用触发词速览

| 触发词（或组）                   | 对应技能                                 |
| -------------------------------- | ---------------------------------------- |
| `开发新视图`、`修改看板`         | 对应视图 Skill（如 `kanban-task-view`）  |
| `添加筛选`、`修改排序`           | 架构技能 `code/skill.md`                 |
| `修改任务标记规则`               | `code/references/tasks-plugin-design.md` |
| `保存对话` / `生成快照` / `清理快照` / `恢复对话` | `sync/update-snapshots.md`（快照管理） |
| `更新技能`、`收尾`               | `sync/update-skill.md`                   |

> 更多触发词请参见各技能文件的 YAML 头部。
