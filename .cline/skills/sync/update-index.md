---
name: 更新技能索引
description: 扫描所有 Skill 文件，生成 skills-index.json，供 AI 快速检索。可由全量同步或手动触发。
triggers:
  - 更新技能索引|刷新技能索引|重建技能索引
---

# 更新技能索引 Skill

## 最高优先级
- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 功能
遍历 `.cline/skills/code/`、`.cline/skills/sync/`、`.cline/skills/references/` 目录，提取每个 `.md` 文件的 YAML 头部信息及文件修改时间，生成 `.cline/skills/skills-index.json`。

## 索引文件结构

```json
{
  "version": "1.0",
  "lastUpdated": "2026-05-08T10:30:00Z",
  "skills": [
    {
      "path": "code/views/matrix-task-view.md",
      "category": "code",
      "name": "四象限矩阵视图开发",
      "description": "开发艾森豪威尔矩阵，按优先级划分四个象限",
      "triggers": ["修改象限分配规则", "调整缓存或排序逻辑", "添加新交互"],
      "skillVersion": "4.0",
      "lastModified": "2026-05-08T09:00:00Z"
    }
  ]
}
```

## 流程

1. **确定扫描目录**：
   - `code/`（所有子目录，包括 `views/`、`tasks/`、`configs/`、`panel/` 等）
   - `sync/`（排除 `update-index.md` 自身）
   - `references/`
2. **遍历每个 `.md` 文件**：
   - 读取文件内容，使用正则提取 YAML 头部（内容在 `---` 之间）。
   - 若没有 YAML 头部，跳过该文件并记录警告。
   - 提取字段：`name`、`description`、`triggers`（以列表格式存储，若为字符串则按 `|` 分割）、`skill-version`。
   - 通过 `fs.stat` 获取文件修改时间（`mtime`）并转换为 ISO 字符串。
3. **确定 `category`**：
   - 若路径以 `code/` 开头 → `"code"`
   - 若路径以 `sync/` 开头 → `"sync"`
   - 若路径以 `references/` 开头 → `"references"`
4. **构建索引数组**：按路径升序排序。
5. **输出预览**：展示相比于现有索引的新增、更新、删除条目数量。
6. **写入文件**：用户确认后写入 `.cline/skills/skills-index.json`（格式化，缩进 2 空格）。

## 与同步流程集成

- 在 `update-skill.md` 和 `update-code.md` 的全量同步完成后，若 `autoUpdateIndex` 为 `true`，自动调用本技能。
- 用户也可手动执行 `更新技能索引` 单独运行。

## 协作说明

- 只读分析，不修改 Skill 文件。
- 供 `update-readme.md`、`update-skill-self.md` 等技能使用。