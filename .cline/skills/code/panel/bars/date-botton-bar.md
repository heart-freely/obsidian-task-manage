# 日期级联筛选面板

## 文件位置

`src/panel/bars/date-botton-bar.js`

## 功能概述

提供年/季/月/周/周几的五级级联日期筛选 UI。用户选中上级后，下级按钮才可点击（disabled 状态切换），支持多选。最后通过 `getQueryRangeFromDateSelection` 将选中项合并为一个日期范围用于查询。

## 依赖

- `DateUtils` (`common-process.js`) - 日期范围计算工具
- `CONFIG.YEAR_LIST` (`plugin-configs.js`) - 年份列表

## 调用方

- `panel.js` - 与 `quick-botton-bar` 互斥使用

## 导出 API

### `buildDateCascadePanel(container, dv, state)`

- **类型**: `void`
- **描述**: 构建级联筛选面板 UI

### `resetCascadeDateUI(state)`

- **类型**: `void`
- **描述**: 公开的级联清除接口，供外部重置时调用

### `getQueryRangeFromDateSelection(state)`

- **类型**: `{start: Date, end: Date} | null`
- **描述**: 将级联选择转换为日期范围查询对象
- **返回值**: 日期范围对象，无选择时返回 `null`

## 状态字段

| 字段                            | 类型          | 说明                                                      |
| ------------------------------- | ------------- | --------------------------------------------------------- |
| `state.dateState.selections`    | Object        | 五级选择状态 `{years, quarters, months, weeks, weekdays}` |
| `state.yearBtns`                | HTMLElement[] | 年份按钮数组                                              |
| `state.quarterBtns`             | HTMLElement[] | 季度按钮数组                                              |
| `state.monthBtns`               | HTMLElement[] | 月份按钮数组                                              |
| `state.weekBtns`                | HTMLElement[] | 周数按钮数组                                              |
| `state.weekdayBtns`             | HTMLElement[] | 周几按钮数组                                              |
| `state.filterCache.fingerprint` | string        | 筛选缓存指纹，选中变化后清空                              |

## DOM 结构

```
.filter-section (容器)
label: 年份 | 季度 | 月份 | 周数 | 周几
  ├── 年份: 2023-2033 按钮 (始终可点击)
  ├── 季度: 第1-4季度 按钮 (选中唯一年份时启用)
  ├── 月份: 1-12月 按钮 (选中唯一季度时启用，仅显示该季度3个月)
  ├── 周数: 第1-4周 按钮 (选中唯一月份时启用)
  └── 周几: 周一至周日 按钮 (选中唯一周时启用)

按钮样式: .cascade-btn / .cascade-btn-active / .cascade-btn-disabled
```

## 执行流程

```
buildDateCascadePanel(container, dv, state)
创建 5 行 label+按钮 → 年份行始终可点击 → 季度/月份/周数/周几初始 disabled
点击年份 → 切换选中 → 唯一选中时下级启用，否则下级清空/禁用
点击季度 → 类似级联 → 月份只显示该季度 3 个月
点击月份 → 周数列出 4 周 → 点击周 → 周几列出 7 天
各级选中多个时下级被清空并禁用

getQueryRangeFromDateSelection:
从最细粒度反向合成日期范围（周几 > 周 > 月 > 季度 > 年）
```

## 技术条件

| 条件                   | 说明                                          |
| ---------------------- | --------------------------------------------- |
| **上级选中数量 !== 1** | 下级全部 disabled                             |
| **上级选中数量 === 1** | 下级 enabled                                  |
| **月份行**             | 选中季度后仅显示该季度的 3 个月               |
| **日期范围优先级**     | 周几 > 周 > 月 > 季度 > 年                    |
| **缓存清空**           | 任何选中变化 → 清空 `filterCache.fingerprint` |
