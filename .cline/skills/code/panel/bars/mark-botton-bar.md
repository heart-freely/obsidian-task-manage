# 标签筛选面板 (Mark Botton Bar)

## 功能概述

提供任务的标签筛选面板，支持全部/单标签模式切换。用户可通过标签对任务进行快速分类筛选。

## 依赖

- 无外部依赖

## API 接口

### panel.js (全局状态 `state`)

- `state.selectedTag` — 当前选中的标签（空字符串=全部）
- `state.allTags` — 所有可用标签列表
- `state.filterCache.fingerprint` — 标签变化后需清空

## 状态管理

| 状态属性                        | 类型       | 说明                           |
| ------------------------------- | ---------- | ------------------------------ |
| `state.selectedTag`             | `string`   | 当前筛选标签，"全部"时为 `""`  |
| `state.allTags`                 | `string[]` | 从任务数据中提取的所有标签集合 |
| `state.filterCache.fingerprint` | `string`   | 标签筛选变化后清空             |

## 导出函数

### `buildMarkPanel(container, dv, state)`

- **类型**: `(HTMLElement, Object, Object) => HTMLElement`
- **说明**: 构建标签筛选面板，含"全部"按钮和动态标签按钮
- **别名**: `buildMarkFilterPanel`

## DOM 结构

```html
.markRow (容器 display:flex gap:12px) button.tag-btn / button.tag-btn-active
"全部" 按钮 | #tag1 #tag2 #tag3 ...
```

## 执行流程

```
buildMarkPanel(container, dv, state)
  → 创建 markRow
  → 创建"全部"按钮(初始 active 如果 !selectedTag)
  → 遍历 state.allTags 创建标签按钮(加 # 前缀)
  → 每个按钮 onclick: 切换选中标签 → 清除所有按钮 active → 更新选中按钮
  → state.selectedTag 和选中按钮联动
  → 始终清空 filterCache.fingerprint 触发重新筛选
```

## 条件逻辑

- `selectedTag=""` (全部) → "全部"按钮 active
- `selectedTag===tag` → 该标签按钮 active
- 点击已选中的标签 → 清空 `selectedTag` (回到全部)
- 所有标签变化均清空 `filterCache.fingerprint`
- 按钮通过 `.tag-btn-active` 类名控制激活样式

## 源文件

`src/panel/bars/mark-botton-bar.js`
