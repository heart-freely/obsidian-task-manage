---
name: 更新技能
description: 正向同步（源码→Skill）与功能校验。支持单独校验；同步前可选提醒。
triggers:
  - 更新技能|同步技能|同步到文档|全局同步技能|全局更新技能
  - 检查功能实现|功能校验|验证实现
---

# 更新技能 Skill（正向同步中枢 + 功能校验）

## 最高优先级
- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 功能概述
- **功能校验**：分析 Skill 的 `## 功能` 与源码实现一致性。
- **正向同步**：从源码注释、JSDoc、import 提取信息，更新 Skill（遵循 `@manual`/`@sync` 标记）。


## 一、功能校验（单独触发）

**触发词**：`检查功能实现` / `功能校验`

**流程**：
1. 确定目标 Skill（用户指定或询问）。
2. 读取 `## 功能` 章节，提取功能点列表。
3. 通过 `README.md` 映射找到源码，读取全文。
4. AI 逐条判断：`✅完全实现` / `⚠️部分实现` / `❌未实现`，给出理由。
5. 输出 Markdown 报告（表格 + 完成率）。
6. 若追加 `--suggest`，输出缺失代码建议（不写入）。


## 二、正向同步（默认）

**触发词**：`更新技能` / `同步技能` / `同步到文档` / `全局同步技能`

### 同步前提醒（可配置）
- 若 `remindFeatureCheck` 为 `true`（默认）且存在 `## 功能` 章节，询问：“是否先运行功能校验？”
  - 是 → 执行校验，报告后询问“继续同步？”
  - 否/跳过 → 直接同步。
- 若 `remindFeatureCheck` 为 `true`（默认）且存在 `## 功能` 章节，还会询问是否先运行功能校验（独立于一致性巡检）。

### 同步流程
1. **变更检测**：`git status` + `.cline/skills/cache/sync_state.json`（mtime/hash）。
2. **定位 Skill**：通过 `README.md` 映射。
3. **信息提取**：
   - 头部（描述、依赖、导出、`@see`）
   - `@skill-*` 标签（sig、dom、state、flow、condition、api、algorithm）
   - JSDoc（`@param`、`@returns`）
   - `import` / `require` → 映射为 Skill 路径
   - 全局标签（`@skill-global-style`、`@skill-global-state`）→ 写入 `code/skill.md`
4. **更新 Skill**：
   - 跳过 `@manual` 章节
   - 覆盖 `@sync` 或无标记章节
   - `## 修改指南` 追加新条目（不覆盖）
   - `## 依赖` 完全由 `import` 生成
5. **自动校验**：检查 YAML、`@see`、章节结构，自动修复格式。
6. **结构对齐**（全量同步）：
   - 对比 `src/` 与 `README.md` 映射，生成 diff 预览。
   - 用户确认后增删改映射行。
7. 保存缓存，输出摘要。



## 三、自动创建 Skill 模板

根据源码特征精简章节：
- 无 `render()` → 不生成 `## DOM 结构`
- 无内部状态 → 不生成 `## 状态模型`（写“无”）
- 无复杂算法 → 不生成 `## 关键算法复杂度`



## 四、配置项（`.cline/sync_config.json`）
```json
{
  "remindFeatureCheck": true,
  "enablePreSyncCheck": true
}
```

## 五、协作说明
- 功能校验只读，不修改文件。
- 正向同步依赖 `update-comment.md` 维护的注释缓存。
- 反向同步由 `update-code.md` 负责。

