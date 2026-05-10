---
name: 更新代码
description: 反向同步（Skill→源码）同步前可选提醒功能校验；全量反向同步后自动更新索引。
triggers:
  - 初始化注释锚点  
  - 更新代码|反向同步
  - 全局同步代码
descriptions:
  - 增量反向同步
  - 全量反向同步 + 索引刷新
  - 记录反向同步注释行号
---

# 更新代码 Skill（反向同步中枢 + 功能校验）

## 最高优先级

- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 功能概述

- 锚点初始化：从所有已映射的源码文件生成注释插入到对应js文件头部，并记录插入点行号。
- **反向同步**：将 Skill 中 `<!-- @sync -->` 章节转为 @skill-*（正则表达式）`注释写入源码。

---

## 注释锚点初始化（`初始化注释锚点` 命令）

**触发词**：`初始化注释锚点` 

- 扫描所有已映射的源码js文件，映射关系查看`.cline/skills/skills.md`。
- 将js文件中 `@skill-anchor: <标识>` 注释的行号和内容解析出来，注释规范参考`.cline/skills/sync/update-comment.md`。
- 将每个js文件中的所有@skill-*（正则表达式）注释更新到注释缓存文件的“comments”里的一个大括号中`.cline/skills/cache/code_cache.json`。参考[注释缓存文件结构](## 注释缓存文件结构)
  - 注释的锚点起始行号读取出来
  - 注释全文复制出来
  - 非@skill-*（正则表达式）注释忽略

- 如果`.cline/skills/cache/code_cache.json`不存在则创建，存在则更新对应字段的内容。


## 反向同步（默认）

**触发词**：`更新代码` / `反向同步` → 增量反向同步
**触发词**：`全局同步代码` → 全量反向同步

### 同步前提醒（可配置）

- 若 `.cline/skills/sync/sync_config.json` 中 `remindFeatureCheck` 为 `true`（默认）且当前 Skill 存在 `## 功能` 章节，询问：“是否先运行功能校验？”
- 是 → 执行功能校验，报告后询问“继续反向同步？”
- 否/跳过 → 直接同步。

### 增量反向同步流程

1. **变更检测**：使用 `git status` 找出修改的 `.md` 文件，仅处理位于 `.cline/skills/code/` 和 `.cline/skills/sync/` 下的 Skill 文件。

2. **定位源码**：在 `.cline/skills/skills.md` 映射表中找到对应的源码路径。

3. **解析 Skill 变更章节**：

   1. 只处理 `<!-- @sync -->` 标记的章节（如 `## 核心函数 (@skill-sig)`、`## DOM 结构 (@skill-dom)` 等）

   2. 忽略 `@manual` 章节。

4. **生成注释内容**：根据章节到标签的映射规则，将章节内容转换为 @skill-*（正则表达式）`注释：

   - **生成头部注释**：提取 `文件`、`描述`、`依赖`、`对外导出`、`注意事项`。


      - **生成@skill-*（正则表达式）`标签**：`@skill-sig`、`@skill-dom`、`@skill-state`、`@skill-flow`、`@skill-condition`、`@skill-api`、`@skill-algorithm` 、`@skill-anchor`等直接读取其注释内容。



5. 更新注释缓存文件：`.cline/skills/cache/code_cache.json` 

   1. 对比注释缓存文件中对应字段
      - 行号不修改
      - 如果上一步“生成注释内容”的 @skill-*（正则表达式）`注释和 `.cline/skills/cache/code_cache.json`中内容含义不一样则替换，
      - 如果一样仅定位插入点。
6. **定位插入点**：
   - **优先**：读取 `.cline/skills/cache/code_cache.json` 中该源码文件的锚点位置（如 `"line": 45`）。

   - **若注释缓存文件中无缓存**：在源码中搜索 `/* @skill-anchor: <标识>  */` 注释，标识通常为函数名或类名。

   - **正则启发式匹配**：若仍找不到，使用正则表达式匹配函数定义（如 `function\s+functionName\s*\(`）或类定义（`class\s+ClassName`）的上一行作为插入点。

   - **若所有方法失败**：提示用户运行 `初始化注释锚点` 命令。


6. **更新源码注释**：
   - 从`.cline/skills/cache/code_cache.json` 中读取锚点位置和注释
   
   - 如果锚点起始行号存在，替换从该锚点开始的整个注释块（从 `/*` 到 `*/`）。
   
   - 如果锚点起始行号不存在但能确定位置，则在锚点位置插入新注释。


7. **冲突处理**：读取 `.cline/skills/sync/sync_config.json` 中的 `prefer` 字段：

   - `"source"`：保留源码现有注释，不修改。

   - `"skill"`：用 Skill 的内容覆盖源码注释。

   - `"ask"`（默认）：生成冲突报告，使用 `ask_followup_question` 让用户选择。


8. **更新注释缓存文件**：将插入/替换后的锚点行号和新的注释内容解析结果写入 `.cline/skills/cache/code_cache.json`。
9. 输出同步摘要。

### 全量反向同步（`全局同步代码`）额外步骤

- 遍历所有 Skill 文件，依次执行上述增量反向同步。
- 完成后若 `autoUpdateIndex` 为 `true`，自动调用 `update-index.md` 和 `update-skills.md` 刷新skill-index.md和 skills.md。

---

## 注释缓存文件结构

以下为格式示例：

```json
{
	"version": "1.0",
	"code": "2026-05-08T10:30:00Z",
	"comments": [
		{
			"path": "src/panel/views/base-task-view.js",
			"category": "views",
			"name": "基础任务视图",
			"description": "基础任务视图类 BaseTaskView（继承 ItemView），以及通用任务卡片创建、数据标准化工具函数",
			"srcVersion": "4.0",
            "hash": "f7484ce256025e4f7ea9fa9809803554d3c46acf",
			"lastModified": "2026-05-08T09:00:00Z",
			"commentGroups": [
				{
					"line": "@skill-*（正则表达式）注释的起始行号",
					"comment": "/* @skill-*（正则表达式）注释 */"
				},
				{
					"line": "@skill-anchor: <标识>注释的起始行号",
					"comment": "/* @skill-anchor: <标识>注释 */"
				}
			]
		}
	]
}
```

## 冲突报告模板

当 `prefer` 为 `ask` 且发生冲突时，输出以下格式：


```markdown
# 冲突报告

| 文件      | 标签         | Skill 中的内容         | 源码中的现有内容       |
| --------- | ------------ | ---------------------- | ---------------------- |
| `src/...` | `@skill-sig` | `function foo(): void` | `function bar(): void` |

请选择：

1. 用 Skill 版本覆盖
2. 保留源码版本
3. 手动合并
```

## 四、配置项（`.cline/skills/sync/sync_config.json`）

```json
{
	"prefer": "ask",
	"remindFeatureCheck": true,
	"autoUpdateIndex": true
}
```

## 五、协作说明

- 功能校验只读，不修改文件。
- 反向同步依赖 `skills.md` 映射表。
- 可与 `update-code.md` 配合形成完整闭环。
- 索引生成由 `update-index.md` 负责。
- 可用运行脚本生成`src/scripts/init-comment-anchors.js`，维护更新。
