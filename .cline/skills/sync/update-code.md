---
name: 更新代码
description: 反向同步（Skill→源码）与功能校验。支持单独校验；同步前可选提醒；全量反向同步后自动更新索引。
triggers:
    - 更新代码|反向同步
    - 全局同步代码
    - 检查功能实现|功能校验
descriptions:
    - 增量反向同步
    - 全量反向同步 + 索引刷新
    - 功能校验
---

# 更新代码 Skill（反向同步中枢 + 功能校验）

## 最高优先级

- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 功能概述

- **功能校验**：分析 Skill 的 `## 功能` 与源码实现一致性。
- **反向同步**：将 Skill 中 `<!-- @sync -->` 章节转为 `@skill-*` 注释写入源码。

---

## 一、功能校验（单独触发）

**触发词**：`检查功能实现` / `功能校验`

**流程**：

1. 确定目标 Skill（用户指定或询问）。
2. 读取 `## 功能` 章节，提取功能点列表（以 `-` 开头的行）。
3. 通过 `.cline/skills/README.md` 映射表找到对应源码文件。
4. 读取源码全文。
5. 调用 AI 逐条判断：`✅完全实现` / `⚠️部分实现` / `❌未实现`，并给出简要理由。
6. 输出 Markdown 表格报告，包含功能点、状态、依据，并计算完成率。
7. 若用户追加 `--suggest`，输出缺失功能的代码建议（不自动写入）。

---

## 二、反向同步（默认）

**触发词**：`更新代码` / `反向同步` → 增量反向同步
**触发词**：`全局同步代码` → 全量反向同步

### 同步前提醒（可配置）

- 若 `.cline/skills/sync/sync_config.json` 中 `remindFeatureCheck` 为 `true`（默认）且当前 Skill 存在 `## 功能` 章节，询问：“是否先运行功能校验？”
- 是 → 执行校验，报告后询问“继续反向同步？”
- 否/跳过 → 直接同步。

### 增量反向同步流程

1. **变更检测**：使用 `git status` 找出修改的 `.md` 文件，仅处理位于 `.cline/skills/code/` 和 `.cline/skills/sync/` 下的 Skill 文件。
2. **定位源码**：在 `.cline/skills/README.md` 映射表中找到对应的源码路径。
3. **解析 Skill 变更章节**：只处理 `<!-- @sync -->` 标记的章节（如 `## 核心函数 (@skill-sig)`、`## DOM 结构 (@skill-dom)` 等），忽略 `@manual` 章节。
4. **生成注释内容**：根据章节到标签的映射规则，将章节内容转换为 `@skill-*` 注释：

- `## 核心函数 (@skill-sig)` 下的列表项 `- functionName(params): returnType - 描述` → `/* @skill-sig functionName(params): returnType - 描述 */`
- `## DOM 结构 (@skill-dom)` 下的代码块 → `/* @skill-dom \n 原始内容\n */`
- 其他类似。

5. **定位插入点**：

- **优先**：读取 `.cline/skills/cache/anchor_cache.json` 中该源码文件的锚点位置（如 `"mapToQuadrant": 45`）。
- **若无缓存**：在源码中搜索 `// @skill-anchor: <标识>` 注释，标识通常为函数名或类名。
- **正则启发式匹配**：若仍找不到，使用正则表达式匹配函数定义（如 `function\s+functionName\s*\(`）或类定义（`class\s+ClassName`）的上一行作为插入点。
- **若所有方法失败**：提示用户运行 `初始化锚点` 命令。

6. **更新源码注释**：

- 如果锚点存在，替换从该锚点开始的整个注释块（从 `/*` 到 `*/`）。
- 如果锚点不存在但能确定位置，则在目标代码块前插入新注释。

7. **冲突处理**：读取 `.cline/skills/sync/sync_config.json` 中的 `prefer` 字段：

- `"source"`：保留源码现有注释，不修改。
- `"skill"`：用 Skill 的内容覆盖源码注释。
- `"ask"`（默认）：生成冲突报告，使用 `ask_followup_question` 让用户选择。

8. **更新缓存**：将插入/替换后的锚点行号写入 `anchor_cache.json`，并将新的注释内容解析结果写入 `parsed_cache.json`。
9. 输出同步摘要。

### 全量反向同步（`全局同步代码`）额外步骤

- 遍历所有 Skill 文件，依次执行上述增量反向同步。
- 完成后若 `autoUpdateIndex` 为 `true`，自动调用 `update-index.md` 和 `update-readme.md` 刷新索引和 README。

### 锚点初始化（`初始化锚点` 命令）

- 扫描所有已映射的源码文件。
- 为每个函数、类、状态对象生成 `// @skill-anchor: <标识>` 注释，插入到合适位置（函数前、类顶部等）。
- 更新 `anchor_cache.json`。

---

## 三、冲突报告模板

当 `prefer` 为 `ask` 且发生冲突时，输出以下格式：

# 冲突报告

```markdown
| 文件      | 标签         | Skill 中的内容         | 源码中的现有内容       |
| --------- | ------------ | ---------------------- | ---------------------- |
| `src/...` | `@skill-sig` | `function foo(): void` | `function bar(): void` |
```

请选择：

1. 用 Skill 版本覆盖
2. 保留源码版本
3. 手动合并

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
- 反向同步依赖 `README.md` 映射表。
- 可与 `update-code.md` 配合形成完整闭环。
- 索引生成由 `update-index.md` 负责。
