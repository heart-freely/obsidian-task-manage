<!-- SYNC_PROJECT_START -->

# project文件树

```text
root/
├── manifest.json                   # 插件清单
├── styles.css                      # 全局样式
├── package.json                    # 依赖管理
├── versions.json                   # 版本兼容性
├── src/
│   ├── main.js                     # 插件入口：注册所有视图、命令，启动数据加载
│   ├── configs/
│   │   └── plugin-configs.js       # 全局常量：文件夹路径、状态映射、优先级定义
│   ├── echarts/
│   │   └── echarts.js              # ECharts 封装模块，确保全局可用
│   ├── panel/
│   │   ├── panel.js                # 导航中心 ItemView：注册视图、管理生命周期
│   │   ├── bars/                   # UI 按钮栏组件
│   │   │   ├── control-botton-bar.js   # 控制按钮栏（刷新、间隔模式、显隐切换）
│   │   │   ├── date-botton-bar.js      # 日期级联选择器（年/季/月/周/日）
│   │   │   ├── hide-botton-bar.js      # 筛选面板与任务树的显示/隐藏
│   │   │   ├── mark-botton-bar.js      # 标签筛选面板（全部/单标签模式）
│   │   │   ├── quick-botton-bar.js     # 快速日期筛选面板
│   │   │   ├── side-botton-bar.js      # 侧边视图切换面板
│   │   │   └── sort-botton-bar.js      # 排序控制面板
│   │   ├── components/
│   │   │   └── tree-view-components.js # 任务树渲染器，折叠/展开/排序/过滤
│   │   ├── interacts/
│   │   │   ├── chart-interact.js       # 图表缩放/拖拽/自适应交互
│   │   │   └── tooltip-interact.js     # 通用 Tooltip 管理器
│   │   └── views/                     # 所有子视图（均继承 BaseTaskView）
│   │       ├── base-list-view.js      # 列表视图基类
│   │       ├── base-table-view.js     # 表格视图基类
│   │       ├── base-task-view.js      # 任务视图基类
│   │       ├── calendar-task-view.js  # 日历视图
│   │       ├── data-tasks-view.js     # 数据图表视图（ECharts）
│   │       ├── depends-task-view.js   # 依赖任务视图
│   │       ├── edit-tasks-view.js     # 任务编辑视图
│   │       ├── future-task-all-view.js# 未来所有任务视图
│   │       ├── future-task-n-view.js  # 未来N天任务视图
│   │       ├── gantt-task-view.js     # 甘特图视图
│   │       ├── important-task-view.js # 重要任务视图
│   │       ├── inbox-task-view.js     # 收集箱视图
│   │       ├── kanban-task-view.js    # 看板视图
│   │       ├── matrix-task-view.js    # 艾森豪威尔矩阵视图
│   │       ├── organize-task-view.js  # 任务整理箱视图
│   │       ├── overdue-task-view.js   # 逾期任务视图
│   │       ├── pomodoro-task-view.js  # 番茄钟统计视图（占位）
│   │       ├── recurring-task-view.js # 循环任务视图
│   │       ├── table-task-view.js     # 表格视图
│   │       ├── tag-task-view.js       # 标签任务视图
│   │       ├── timeline-task-view.js  # 时间线任务视图
│   │       ├── today-task-view.js     # 今天任务视图
│   │       ├── tree-task-view.js      # 树状视图
│   │       └── view-list-tasks.js     # 通用视图任务列表
│   ├── storages/
│   │   └── persist-storages.js        # 持久化管理与状态创建
│   ├── tasks/
│   │   ├── process/                   # 任务处理模块
│   │   │   ├── calcul-chart-process.js    # 图表数据纯计算模块
│   │   │   ├── common-process.js          # 工具函数集（日期操作、帧节流）
│   │   │   ├── filter-task-process.js     # 多条件任务过滤核心
│   │   │   ├── inbox-task-process.js      # 收件箱任务处理
│   │   │   ├── kanban-task-process.js     # 看板任务处理
│   │   │   ├── matrix-task-process.js     # 艾森豪威尔矩阵处理
│   │   │   ├── organize-task-process.js   # 任务整理处理
│   │   │   ├── recurring-task-process.js  # 循环任务处理
│   │   │   ├── task-query-process.js      # 任务查询入口（基于 Tasks 插件 API）
│   │   │   └── tree-task-process.js       # 树形任务处理
│   │   ├── read/
│   │   │   └── read-tasks.js              # 任务读取和解析模块
│   │   └── write/
│   │       └── write-tasks.js             # 任务写入工具模块（预留）
│   └── utils/
│       └── logger.js                  # 日志工具（生产环境静默）
```

<!-- SYNC_PROJECT_END -->

<!-- SYNC_FILES_START -->

# skills文件树

```text
.cline/skills/
├── README.md                        # 技能文件索引
├── skills-index.json                # 所有技能元数据索引
├── skills.md                        # 技能索引总览（本项目）
├── archive/                         # 归档旧技能文件
├── cache/                           # 缓存文件
│   ├── code_cache.json              # 源码中 @skill-* 注释的解析结果缓存
│   ├── parsed_cache.json            # 源码 `@skill-*` 注释解析缓存
│   └── anchor_cache.json            # `@skill-anchor` 位置缓存
├── code/                            # 源码技能——与具体功能模块对应
│   ├── code.md                      # 插件整体架构、数据流、开发规范
│   ├── main.md                      # 插件主入口技能
│   ├── __tests__/
│   │   └── test.md                  # 测试要点参考（只读）
│   ├── configs/
│   │   └── plugin-configs.md        # 插件全局配置
│   ├── echarts/
│   │   └── echarts.md               # ECharts 封装技能
│   ├── panel/
│   │   ├── panel.md                 # 导航中心面板技能
│   │   ├── bars/                    # 按钮栏技能
│   │   │   ├── control-botton-bar.md
│   │   │   ├── date-botton-bar.md
│   │   │   ├── hide-botton-bar.md
│   │   │   ├── mark-botton-bar.md
│   │   │   ├── quick-botton-bar.md
│   │   │   ├── side-botton-bar.md
│   │   │   └── sort-botton-bar.md
│   │   ├── components/
│   │   │   └── tree-view-components.md
│   │   ├── interacts/
│   │   │   ├── chart-interact.md    # 图表交互技能
│   │   │   └── tooltip-interact.md  # Tooltip 交互技能
│   │   └── views/                   # 视图技能
│   │       ├── base-card-view.md    # 通用卡片工厂开发
│   │       ├── base-list-view.md    # 通用列表工厂开发
│   │       ├── base-table-view.md   # 通用表格工厂开发
│   │       ├── base-task-view.md    # 任务视图基类
│   │       ├── calendar-task-view.md# 日历视图开发
│   │       ├── data-tasks-view.md   # 统计图表视图开发
│   │       ├── depends-task-view.md # 依赖视图开发
│   │       ├── edit-tasks-view.md   # 单任务编辑视图开发
│   │       ├── future-task-all-view.md
│   │       ├── future-task-n-view.md# 未来N天视图开发
│   │       ├── gantt-task-view.md   # 甘特图视图开发
│   │       ├── important-task-view.md# 重要任务视图开发
│   │       ├── inbox-task-view.md   # 收件箱视图开发
│   │       ├── kanban-task-view.md  # 看板视图开发
│   │       ├── matrix-task-view.md  # 四象限矩阵视图开发
│   │       ├── organize-task-view.md# 任务整理箱视图开发
│   │       ├── overdue-task-view.md # 逾期任务视图开发
│   │       ├── pomodoro-task-view.md# 番茄钟视图开发
│   │       ├── recurring-task-view.md# 循环任务视图开发
│   │       ├── table-task-view.md
│   │       ├── tag-task-view.md     # 标签聚合视图开发
│   │       ├── timeline-task-view.md# 时间轴视图开发
│   │       ├── today-task-view.md   # 今天任务视图开发
│   │       ├── tree-task-view.md    # 任务树视图开发
│   │       ├── view-list-tasks.md   # 通用任务列表渲染组件开发
│   │       └── views.md             # 视图注册中心
│   ├── references/                  # 参考技能（只读）
│   │   ├── develop-standard.md      # 开发规范参考
│   │   ├── obsidian-plugin-basics.md# Obsidian 插件开发基础参考
│   │   ├── project-software-design.md
│   │   └── tasks-plugin-design.md   # Tasks 插件设计参考
│   ├── storage/
│   │   └── persist-storages.md
│   ├── tasks/
│   │   ├── tasks.md                 # 任务数据模型
│   │   ├── process/                 # 任务处理模块技能
│   │   │   ├── calcul-chart-process.md  # 图表数据计算
│   │   │   ├── common-process.md        # 通用任务处理
│   │   │   ├── filter-task-process.md   # 任务筛选处理
│   │   │   ├── inbox-task-process.md    # 收件箱任务处理
│   │   │   ├── kanban-task-process.md   # 看板任务处理
│   │   │   ├── matrix-task-process.md   # 矩阵任务处理
│   │   │   ├── organize-task-process.md # 组织任务处理
│   │   │   ├── recurring-task-process.md# 循环任务处理
│   │   │   ├── task-query-process.md    # 任务查询处理
│   │   │   └── tree-task-process.md     # 树状任务处理
│   │   ├── read/
│   │   │   └── read-tasks.md
│   │   └── write/
│   │       └── write.tasks.md       # 任务写入与快照
│   └── utils/
│       └── logger.md                # 日志工具
├── snapshots/                       # 对话快照
│   ├── index.json                   # 快照索引
│   ├── 2026-05-09-0922.md
│   └── 2026-05-09-0933.md
└── sync/                            # 同步/运维技能
    ├── sync_config.json             # 同步配置
    ├── update-code.md               # 反向同步（Skill→源码）
    ├── update-comment.md            # 注释管理
    ├── update-index.md              # 索引更新
    ├── update-skill-depend.md       # 依赖分析
    ├── update-skill-self.md         # 自举验证
    ├── update-skill-version.md      # 版本迁移
    ├── update-skill.md              # 正向同步（源码→Skill）
    ├── update-skills.md             # 更新 skills.md（本项目）
    ├── update-smart-check.md        # 一致性巡检
    ├── update-smart-sync.md         # 智能同步（统一入口）
    └── update-snapshot.md           # 快照管理
```

<!-- SYNC_FILES_END -->

<!-- SYNC_TRIGGERS_START -->

# 双向同步技能触发词列表

## update-code.md

执行触发词操作：初始化注释锚点（增量反向同步）（.cline/skills/sync/update-code.md）
执行触发词操作：更新代码 或 反向同步（全量反向同步 + 索引刷新）（.cline/skills/sync/update-code.md）
执行触发词操作：全局同步代码（记录反向同步注释行号）（.cline/skills/sync/update-code.md）

## update-comment.md

执行触发词操作：更新注释（增量更新注释）（.cline/skills/sync/update-comment.md）
执行触发词操作：新增注释（新增注释）（.cline/skills/sync/update-comment.md）
执行触发词操作：全局更新注释（全局更新注释）（.cline/skills/sync/update-comment.md）
执行触发词操作：删除注释（删除注释）（.cline/skills/sync/update-comment.md）
执行触发词操作：校验注释 或 校验注释格式（校验注释格式）（.cline/skills/sync/update-comment.md）
执行触发词操作：修正注释格式 或 修复注释格式（修正注释格式）（.cline/skills/sync/update-comment.md）
执行触发词操作：注释规范 或 注释要求 或 如何写注释（查阅规范）（.cline/skills/sync/update-comment.md）

## update-index.md

执行触发词操作：更新索引 或 刷新索引 或 重建索引（生成/更新索引）（.cline/skills/sync/update-index.md）

## update-skill-depend.md

执行触发词操作：检查依赖（依赖分析）（.cline/skills/sync/update-skill-depend.md）

## update-skill-self.md

执行触发词操作：验证自身 或 自举 或 检查自身规范（自举验证）（.cline/skills/sync/update-skill-self.md）

## update-skill-version.md

执行触发词操作：升级技能格式 或 迁移版本 或 检查版本（版本迁移）（.cline/skills/sync/update-skill-version.md）

## update-skill.md

执行触发词操作：更新技能 或 同步技能（增量正向同步）（.cline/skills/sync/update-skill.md）
执行触发词操作：全局同步技能（全量正向同步 + 结构对齐 + 索引刷新）（.cline/skills/sync/update-skill.md）

## update-skills.md

执行触发词操作：更新skills 或 刷新skills 或 同步skills 或 生成skills（更新项目文件索引和skills文件索引）（.cline/skills/sync/update-skills.md）

## update-smart-check.md

执行触发词操作：检查一致性 或 巡检（一致性巡检）（.cline/skills/sync/update-smart-check.md）
执行触发词操作：检查功能实现 或 功能校验（功能校验）（.cline/skills/sync/update-smart-check.md）

## update-smart-sync.md

执行触发词操作：同步 或 全量同步 或 同步检查（智能同步）（.cline/skills/sync/update-smart-sync.md）

## update-snapshot.md

执行触发词操作：保存对话 或 生成快照 或 保存会话 或 创建快照（保存快照）（.cline/skills/sync/update-snapshot.md）
执行触发词操作：清理快照 或 删除旧快照 或 清理旧快照（清理快照）（.cline/skills/sync/update-snapshot.md）
执行触发词操作：恢复对话 或 加载快照 或 恢复快照 或 恢复上次状态（恢复对话）（.cline/skills/sync/update-snapshot.md）
执行触发词操作：从快照更新技能 或 快照同步技能（快照→Skill联动）（.cline/skills/sync/update-snapshot.md）
执行触发词操作：撤销同步 或 回滚快照（回滚同步）（.cline/skills/sync/update-snapshot.md）

<!-- SYNC_TRIGGERS_END -->

<!-- SYNC_CONFIGS_START -->

# 配置与缓存文件表

| 文件                    | 用途                                                                         | 维护方式         |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------- |
| `skills-index.json`     | 所有技能的元数据（路径、名称、触发词、版本、修改时间）                       | AI 自动生成/更新 |
| `sync/sync_config.json` | 同步行为的配置（仲裁规则、自动快照、索引更新等）                             | 人工手动编辑     |
| `snapshots/index.json`  | 快照文件的索引（文件名、时间戳、主题、决策）                                 | AI 自动维护      |
| `cache/sync_state.json` | 上次同步状态的记录（commit hash、文件 mtime）                                | AI 自动读写      |
| `cache/code_cache.json` | 源码中锚点（`@skill-anchor`）的位置缓存,源码中 `@skill-*` 注释的解析结果缓存 | AI 自动更新      |

<!-- SYNC_CONFIGS_END -->
