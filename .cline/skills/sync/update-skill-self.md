---
name: 自举验证
description: 验证 sync/ 下核心 Skill 自身是否符合注释规范，生成元文档。
triggers:
  - 验证自身|自举|检查自身规范
---

# 自举验证 Skill

## 功能

1. 检查以下文件是否包含完整 YAML 头部、`## 最高优先级` 块、`@skill-*` 注释、协作说明：
    - `update-skill.md`, `update-code.md`, `update-snapshots.md`, `update-check.md`, `update-skill-version.md`, `update-skill-version.md`
2. 生成元文档 `.cline/skills/sync/sync-meta.md`（表格：文件、功能、触发词、依赖、自检状态）。
3. 检查 `README.md` 中是否有这些文件的映射（映射到 `sync-meta.md` 或自身）。
4. 输出验证报告，自动修复简单问题（如缺失 YAML 字段）需用户确认。
