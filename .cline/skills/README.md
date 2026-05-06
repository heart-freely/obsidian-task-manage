> # Skills 索引 — Obsidian 任务管理插件
>
> 本技能库为 AI 编程助手（Cline Chinese）提供插件开发所需的上下文信息。所有技能通过 YAML 头部的 `triggers` 字段自动匹配。
>
> ## 目录用途
> - `code/` – 包含与源代码直接相关的 Skill
> - `code/references/` – 只读参考文档
> - `code/views/` – 视图 Skill 文件（二级索引：[views.md](code/views/views.md)）
> - `sync/` – 自动同步、快照、恢复等维护 Skill
> - `snapshots/` – 存放由“保存对话”命令生成的快照文件
> - `archive/` – 存放已归档的旧 Skill（对应源码已删除）
> - `trash/` – 存放标记为删除的 Skill（待清理）
> - `test/` – 预留：测试相关 Skill 或指引
>
> ## 架构技能
> | 技能                 | 文件路径                       |
> | -------------------- | ------------------------------ |
> | 任务管理插件开发架构 | [code/skill.md](code/skill.md) |
>
> ## 参考文档（只读）
> | 文档                  | 文件路径                                                     |
> | --------------------- | ------------------------------------------------------------ |
> | Obsidian 插件开发基础 | [code/references/obsidian-plugin-basics.md](code/references/obsidian-plugin-basics.md) |
> | Tasks 插件自定义设计  | [code/references/tasks-plugin-design.md](code/references/tasks-plugin-design.md) |
>
> ## 视图技能
> 所有视图 Skill 存放在 `code/views/` 目录下，详细列表与触发词请查看二级索引：
> - **[视图技能索引](code/views/views.md)**
>
> ## 同步维护技能
> | 技能                           | 文件路径                                               | 触发词示例                       |
> | ------------------------------ | ------------------------------------------------------ | -------------------------------- |
> | 保存对话 / 生成快照            | [sync/save-snapshots.md](sync/save-snapshots.md)       | `保存对话` `生成快照`            |
> | 恢复对话 / 加载快照            | [sync/recover-snapshots.md](sync/recover-snapshots.md) | `恢复对话` `加载快照`            |
> | 清理快照                       | [sync/clear-snapshots.md](sync/clear-snapshots.md)     | `清理快照`                       |
> | 更新技能（同步代码到技能文件） | [sync/update-skill.md](sync/update-skill.md)           | `更新技能` `同步技能` `全局同步` |
> | 代码注释规范                   | [sync/update-comment.md](sync/update-comment.md)       | `注释规范` `如何写注释`          |
>
> ## 常用触发词速览
> | 触发词                   | 对应技能                                 |
> | ------------------------ | ---------------------------------------- |
> | `开发新视图`、`修改看板` | 对应视图 Skill（如 `kanban-task-view`）  |
> | `添加筛选`、`修改排序`   | 架构技能 `code/skill.md`                 |
> | `修改任务标记规则`       | `code/references/tasks-plugin-design.md` |
> | `保存对话`、`生成快照`   | `sync/save-snapshots.md`                 |
> | `更新技能`、`收尾`       | `sync/update-skill.md`                   |
> | `恢复对话`、`继续工作`   | `sync/recover-snapshots.md`              |
>
> > 更多触发词请参见各技能文件的 YAML 头部。