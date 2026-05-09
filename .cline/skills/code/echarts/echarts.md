# ECharts 封装模块

## 文件位置

`src/echarts/echarts.js`

## 功能概述

ECharts 封装模块——导入 ECharts 库并确保全局可用，兼容旧代码中 `window.echarts` 引用

## 导出 API

### `echarts` (命名导出)

- **类型**: `Object`
- **描述**: 从 echarts npm 包导入的 ECharts 核心库

### `ensureEcharts(callback)`

- **类型**: `void`
- **描述**: 工具函数，立即同步调用回调函数并传入 echarts 实例（兼容旧代码）
- **参数**:
    - `callback: Function` - 接收 echarts 实例的回调函数（旧代码接口，直接同步调用）

## 执行流程

```
模块加载 → import echarts → window.echarts赋值(全局兼容) → 导出echarts和ensureEcharts
ensureEcharts → 检查callback类型 → 立即执行callback(echarts)，无需等待
```

## 技术条件

| 条件         | 说明                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| **所属模块** | echarts - 图表库包装                                                                                             |
| **依赖**     | echarts npm 包（已通过 esbuild 打包到 main.js 中）                                                               |
| **兼容性**   | 设置 `window.echarts` 以支持旧代码中的 `window.echarts` 引用                                                     |
| **同步接口** | `ensureEcharts` 是同步函数（非异步），因为 echarts 已通过 import 同步可用                                        |
| **关联模块** | `src/panel/interacts/chart-interact.js`（图表交互）、`src/tasks/process/calcul-chart-process.js`（图表数据处理） |
