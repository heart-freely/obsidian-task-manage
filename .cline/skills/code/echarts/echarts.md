---
name: ECharts 封装
description: ECharts 图表库的导入、封装和全局兼容
skill-version: 1.0
triggers:
    - 修改 echarts 导入逻辑
    - 调整图表初始化
---

# ECharts 封装模块 <!-- @sync -->

## 文件 <!-- @sync -->

`src/echarts/echarts.js`

## 导出 <!-- @sync -->

### `echarts` (命名导出)

- **类型**: `Object`
- **描述**: 从 echarts npm 包导入的 ECharts 核心库

### `ensureEcharts(callback)`

- **类型**: `void`
- **描述**: 工具函数，立即同步调用回调函数并传入 echarts 实例（兼容旧代码）
- **参数**:
    - `callback: Function` - 接收 echarts 实例的回调函数（旧代码接口，直接同步调用）

## 关联文件 <!-- @sync -->

- 源码：`src/echarts/echarts.js`
- Skill：`.cline/skills/code/echarts/echarts.md`

## 功能 <!-- @manual -->

- 导入 ECharts 库并确保全局可用，兼容旧代码中 `window.echarts` 引用

## 核心函数 (@skill-sig) <!-- @sync -->

- `ensureEcharts(callback: Function): void` - 立即同步调用回调函数并传入 echarts 实例

## 依赖 <!-- @sync -->

- echarts npm 包（已通过 esbuild 打包到 main.js 中）
- 设置 `window.echarts` 以支持旧代码中的 `window.echarts` 引用

## 执行流程

```
模块加载 → import echarts → window.echarts赋值(全局兼容) → 导出echarts和ensureEcharts
ensureEcharts → 检查callback类型 → 立即执行callback(echarts)，无需等待
```

## 关联模块 <!-- @sync -->

- `src/panel/interacts/chart-interact.js`（图表交互）
- `src/tasks/process/calcul-chart-process.js`（图表数据处理）
