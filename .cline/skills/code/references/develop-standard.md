---
name: 开发规范参考
description: 命名规则、样式约定、注释规范等。只读，不参与自动同步。
---

# 开发规范

## 命名规则

| 元素 | 规则 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `base-task-view.js` |
| 视图类型常量 | `VIEW_TYPE_` + UPPER_SNAKE | `VIEW_TYPE_CALENDAR` |
| 类名 | PascalCase | `BaseTaskView` |
| 函数/变量 | camelCase | `getAllTasks` |
| CSS 类名 | kebab-case，视图前缀 | `.task-list`, `.cal-header` |

## 样式约定

- 颜色必须使用 Obsidian CSS 变量（如 `--background-primary`）。
- 深色模式自动适配，Canvas 中动态获取颜色。
- 任务卡片左侧颜色条（逐级加深）：
  - 未开始 `#2e333b`
  - 计划中 `#4b525b`
  - 进行中 `#7fb8f0`
  - 已完成 `#47852f`
  - 已取消 `#c3393e`

## 源文件头部注释（必须）

```javascript
/**
 * 文件：src/panel/views/xxx-view.js
 * 描述：一句话说明文件作用
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 视图基类
 *   - ECharts: 图表库
 * 对外导出：VIEW_TYPE_XXX, XxxView
 * 注意事项：如有性能敏感或特殊逻辑需注明
 * @see .cline/skills/code/views/xxx-view.md
 */
 ```
 
## 性能与编码约束

分页：任务数 > 100 时，PAGE_SIZE = 50
甘特图强制虚拟滚动；大列表避免全量 DOM 渲染
禁止 innerHTML，使用 createElement 或 dv.el()
不向 window 添加自定义属性

本文档只读，不参与自动同步。具体模块的规范细节请参考各自的 Skill。

