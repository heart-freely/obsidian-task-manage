---
name: 更新技能索引
description: 扫描所有`.cline/skills`中的文件,生成索引缓存`.cline/skills/skills-index.json`。
triggers:
  - 更新技能索引|刷新技能索引|重建技能索引
descriptions:
  - 生成/更新技能索引
---

# 更新技能索引 Skill

## 最高优先级
- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 功能
遍历 `.cline/skills/`目录提取每个 `.md` 文件的 YAML 头部信息（包括 `name`、`description`、`skill-version`、`triggers`、`descriptions`）及文件修改时间，生成`.cline/skills/skills-index.json`。

## 索引文件结构

示例：

```json
{
    "version": "1.0",
    "lastUpdated": "2026-05-08T10:30:00Z",
    "skills": [
      {
        "path": ".cline/skills/sync/update-skill.md",
        "category": "sync",
        "name": "更新技能",
        "description": "正向同步（源码→Skill）与功能校验。",
        "skillVersion": "4.0",
        "lastModified": "2026-05-08T09:00:00Z",
        "triggerGroups": [
          { "triggers": "更新技能|同步技能", "description": "增量正向同步" },
          { "triggers": "全局同步技能", "description": "全量正向同步 + 结构对齐 + 索引刷新" },
          { "triggers": "检查功能实现|功能校验", "description": "功能校验" }
        ]
      }
    ]
}
```
## 流程

### **确定扫描目录**：

- `.cline\skills`

### **遍历每个 `.md` 文件**：

- 读取YAML 头部。

  - 若没有 YAML 头部，跳过并记录警告。

  - 提取字段：`name`、`description`、`skill-version`、`triggers`（YAML 中 triggers 是一个列表，每个元素是一个字符串，其中触发词用 `|` 连接，代表一个操作组）、`descriptions`（必须与 `triggers` 长度相同，一一对应）。


- 获取文件修改时间。

### **确定 `category`**：

- 以 `code/` 开头 → `"code"`

- 以 `sync/` 开头 → `"sync"`

- 以 `references/` 开头 → `"references"`

### **构建 `triggerGroups`**：

1. 遍历 `triggers` 列表的每个索引 `i`，生成对象：`{ "triggers": triggers[i], "description": descriptions[i] }`
2. 如果 `descriptions` 字段缺失或长度不匹配，输出警告并跳过该技能。
3. **构建索引数组**：包含上述所有字段，按路径升序排序。
4. **输出预览**：展示相比于现有索引的新增、更新、删除条目数量。
5. **写入文件**：用户确认后写入 `.cline/skills/skills-index.json`（格式化，缩进 2 空格）。

## 与同步流程集成

- 在 `update-skill.md` 和 `update-code.md` 的全量同步完成后，若 `autoUpdateIndex` 为 `true`，自动调用本技能。
- 用户也可手动执行 `更新技能索引` 单独运行。

## 协作说明

- 只读分析，不修改 Skill 文件。
- 供 `update-readme.md`、`update-skill-self.md` 等技能使用。