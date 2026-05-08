---
name: 检查一致性
description: 一致性巡检与依赖分析。支持自动修复非冲突项。
triggers:
  - 检查一致性|巡检
  - 检查依赖
---

# 检查一致性 Skill

## 最高优先级
- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 功能概述
- **一致性巡检**：对比源码注释与 Skill 文档，输出差异报告。
- **依赖分析**：扫描 `## 依赖` 章节，构建依赖图，检测循环引用。

---

## 一、一致性巡检（`检查一致性` / `巡检`）

**流程**：
1. 根据 `.cline/skills/README.md` 映射表，遍历所有源码与 Skill 对。
2. 对每个对：
   - **提取源码注释**：解析 `.cline/skills/cache/parsed_cache.json` 或实时解析源码中的 `@skill-*` 标签，构造内存中的“标准 Skill”表示（只包含 `@sync` 章节）。
   - **读取现有 Skill 文档**：提取 `@sync` 和无标记章节（忽略 `@manual`）。
   - **逐章节对比**：比较函数签名、DOM、状态等是否完全相同。
   - **记录差异**：标记为 `仅源码新`（源码有但 Skill 缺失）、`仅 Skill 新`（Skill 有但源码注释缺失）、`冲突`（内容不同）。
3. 输出 Markdown 表格报告：

```markdown
| 源码文件 | Skill 文件 | 差异章节 | 类型 | 源码内容摘要 | Skill 内容摘要 |
|----------|------------|----------|------|--------------|----------------|
| src/panel/views/today-view.js | code/views/today-view.md | @skill-sig | 冲突 | `sortTasks(priority)` | `sortTasks(order)` |
```

1. 提供选项：
   - `修复所有非冲突项`：对“仅源码新”调用 `update-skill` 更新 Skill；对“仅 Skill 新”调用 `update-code` 更新源码注释。
   - `逐项修复`：每项单独确认。
   - `导出报告`：保存为 `.cline/consistency_report.md`。

   **注意**：自动修复前会输出预览，用户确认后执行。

------

## 二、依赖分析（`检查依赖`）

**流程**：

1. 读取所有 Skill 文件（`.cline/skills/code/` 和 `sync/` 下）的 `## 依赖` 章节。
2. 解析每个条目格式：`- 模块名 (Skill路径)`，提取 Skill 路径。
3. 构建有向图：节点为 Skill 路径，边表示依赖关系（从依赖方指向被依赖方）。
4. **反向依赖查询**：若用户指定了一个 Skill 路径，输出所有依赖它的 Skill 列表。
5. **输出依赖图**：生成 Mermaid 代码块，例如：

```
graph TD
  A[update-skill.md] --> B[update-comment.md]
  C[update-code.md] --> B
```



1. **循环依赖检测**：使用 DFS 检测环，若有则输出警告，列出循环链。

------

## 三、配置项

本技能无额外配置，但自动修复依赖 `update-skill.md` 和 `update-code.md`。

## 四、协作说明

- 只读分析，实际修复委托给 `update-skill` 和 `update-code`。
- 依赖分析结果可用于评估变更影响。