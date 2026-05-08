<!-- README_AUTO_GENERATED_START -->

# 📚 Skill 文件索引

生成于: 2026-05-08T07:50:09Z | 版本: 1.0 | 技能总数: 40

---

<!-- SYNC_FILES_START -->

## 📁 skills 文件树

```text
.cline/skills/
├── archive/                          # 归档
├── cache/
│   ├── anchor_cache.json             # 锚点位置缓存
│   ├── parsed_cache.json             # 注释解析缓存
│   └── sync_state.json               # 同步状态记录
├── code/
│   ├── bars/                         # 按钮栏 Skill
│   ├── configs/
│   │   └── plugin-configs.md         # 插件全局配置
│   ├── panel/components/
│   │   └── tree-view-components.md   # 树视图组件
│   ├── references/
│   │   ├── develop-standard.md       # 开发规范参考
│   │   ├── obsidian-plugin-basics.md # Obsidian 插件基础参考
│   │   └── tasks-plugin-design.md    # tasks 插件设计参考
│   ├── tasks/
│   │   ├── process/
│   │   │   └── filter-task-process.md # 任务筛选处理
│   │   ├── read/
│   │   │   └── read-tasks.md         # 任务读取
│   │   ├── write/
│   │   │   └── write.tasks.md        # 任务写入与快照
│   │   └── tasks.md                  # 任务数据模型
│   ├── views/
│   │   ├── base-card-view.md         # 通用卡片工厂
│   │   ├── base-list-view.md         # 通用列表工厂
│   │   ├── base-table-view.md        # 通用表格工厂
│   │   ├── base-task-view.md         # 任务视图基类
│   │   ├── calendar-task-view.md     # 日历视图
│   │   ├── data-tasks-view.md        # 统计分析视图
│   │   ├── depends-task-view.md      # 依赖视图
│   │   ├── edit-tasks-view.md        # 单任务编辑视图
│   │   ├── future-task-all-view.md   # 全部未来任务视图
│   │   ├── future-task-n-view.md     # 未来N天任务视图
│   │   ├── gantt-task-view.md        # 甘特图视图
│   │   ├── important-task-view.md    # 重要任务视图
│   │   ├── inbox-task-view.md        # 收集箱视图
│   │   ├── kanban-task-view.md       # 看板视图
│   │   ├── matrix-task-view.md       # 四象限矩阵视图
│   │   ├── organize-task-view.md     # 整理箱视图
│   │   ├── overdue-task-view.md      # 逾期任务视图
│   │   ├── pomodoro-task-view.md     # 番茄钟视图
│   │   ├── recurring-task-view.md    # 循环任务视图
│   │   ├── table-task-view.md        # 表格视图
│   │   ├── tag-task-view.md          # 标签聚合视图
│   │   ├── timeline-task-view.md     # 时间轴视图
│   │   ├── today-task-view.md        # 今天任务视图
│   │   ├── tree-task-view.md         # 任务树视图
│   │   ├── view-list-tasks.md        # 通用任务列表渲染组件
│   │   └── views.md                  # 视图注册中心
│   └── __tests__/
│       └── test.md                   # 测试
├── snapshots/
│   └── index.json                    # 快照索引
├── sync/
│   ├── sync_config.json              # 同步配置
│   ├── update-code.md                # 更新代码（反向同步）
│   ├── update-comment.md             # 更新注释
│   ├── update-index.md               # 更新技能索引
│   ├── update-readme.md              # 更新 README
│   ├── update-skill.md               # 更新技能（正向同步）
│   ├── update-skill-self.md          # 自举验证
│   ├── update-skill-version.md       # 版本迁移
│   ├── update-smart-check.md         # 检查一致性
│   ├── update-smart-sync.md          # 智能同步
│   └── update-snapshot.md            # 快照管理
├── test/                             # 测试目录
├── trash/                            # 回收站
├── README.md                         # 本文件
└── skills-index.json                 # 技能索引
```

<!-- SYNC_FILES_END -->

---

## 🔄 双向同步触发词列表

### update-skill.md

- 执行触发词操作：更新技能 或 同步技能（增量正向同步）（.cline/skills/sync/update-skill.md）
- 执行触发词操作：全局同步技能（全量正向同步 + 结构对齐 + 索引刷新）（.cline/skills/sync/update-skill.md）
- 执行触发词操作：检查功能实现 或 功能校验（功能校验）（.cline/skills/sync/update-skill.md）

### update-code.md

- 执行触发词操作：更新代码 或 反向同步（增量反向同步）（.cline/skills/sync/update-code.md）
- 执行触发词操作：全局同步代码（全量反向同步 + 索引刷新）（.cline/skills/sync/update-code.md）
- 执行触发词操作：检查功能实现 或 功能校验（功能校验）（.cline/skills/sync/update-code.md）

### update-comment.md

- 执行触发词操作：更新注释（增量更新注释）（.cline/skills/sync/update-comment.md）
- 执行触发词操作：新增注释（新增注释）（.cline/skills/sync/update-comment.md）
- 执行触发词操作：全局更新注释（全局更新注释）（.cline/skills/sync/update-comment.md）
- 执行触发词操作：删除注释（删除注释）（.cline/skills/sync/update-comment.md）
- 执行触发词操作：校验注释 或 校验注释格式（校验注释格式）（.cline/skills/sync/update-comment.md）
- 执行触发词操作：修正注释格式 或 修复注释格式（修正注释格式）（.cline/skills/sync/update-comment.md）
- 执行触发词操作：注释规范 或 注释要求 或 如何写注释（查阅规范）（.cline/skills/sync/update-comment.md）

### update-index.md

- 执行触发词操作：更新技能索引 或 刷新技能索引 或 重建技能索引（生成/更新技能索引）（.cline/skills/sync/update-index.md）

### update-skill-self.md

- 执行触发词操作：验证自身 或 自举 或 检查自身规范（自举验证）（.cline/skills/sync/update-skill-self.md）

### update-skill-version.md

- 执行触发词操作：升级技能格式 或 迁移版本 或 检查版本（版本迁移）（.cline/skills/sync/update-skill-version.md）

### update-smart-check.md

- 执行触发词操作：检查一致性 或 巡检（一致性巡检）（.cline/skills/sync/update-smart-check.md）
- 执行触发词操作：检查依赖（依赖分析）（.cline/skills/sync/update-smart-check.md）

### update-smart-sync.md

- 执行触发词操作：同步 或 全量同步 或 同步检查（智能同步）（.cline/skills/sync/update-smart-sync.md）

### update-snapshot.md

- 执行触发词操作：保存对话 或 生成快照 或 保存会话 或 创建快照（保存快照）（.cline/skills/sync/update-snapshot.md）
- 执行触发词操作：清理快照 或 删除旧快照 或 清理旧快照（清理快照）（.cline/skills/sync/update-snapshot.md）
- 执行触发词操作：恢复对话 或 加载快照 或 恢复快照 或 恢复上次状态（恢复对话）（.cline/skills/sync/update-snapshot.md）
- 执行触发词操作：从快照更新技能 或 快照同步技能（快照→Skill 联动）（.cline/skills/sync/update-snapshot.md）
- 执行触发词操作：撤销同步 或 回滚快照（回滚同步）（.cline/skills/sync/update-snapshot.md）

---

## ⚙️ 配置与缓存文件

| 文件                      | 用途                                                   | 维护方式         |
| ------------------------- | ------------------------------------------------------ | ---------------- |
| `skills-index.json`       | 所有技能的元数据（路径、名称、触发词、版本、修改时间） | AI 自动生成/更新 |
| `sync/sync_config.json`   | 同步行为的配置（仲裁规则、自动快照、索引更新等）       | 人工手动编辑     |
| `snapshots/index.json`    | 快照文件的索引（文件名、时间戳、主题、决策）           | AI 自动维护      |
| `cache/sync_state.json`   | 上次同步状态的记录（commit hash、文件 mtime）          | AI 自动读写      |
| `cache/parsed_cache.json` | 源码中 `@skill-*` 注释的解析结果缓存                   | AI 自动更新      |
| `cache/anchor_cache.json` | 源码中锚点（`@skill-anchor`）的位置缓存                | AI 自动更新      |

<!-- README_AUTO_GENERATED_END -->
