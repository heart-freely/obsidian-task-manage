---
name: 图表交互
description: ECharts 图表的缩放、拖拽、点击等交互逻辑
skill-version: 1.0
triggers:
    - 修改图表交互
    - 添加图表事件
---

# 图表交互 Skill

## 文件 <!-- @sync -->

`src/panel/interacts/chart-interact.js`

## 导出 <!-- @sync -->

- `setupChartInteract`
- `handleChartZoom`
- `handleChartDrag`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/interacts/chart-interact.js`
- Skill：`.cline/skills/code/panel/interacts/chart-interact.md`

## 功能 <!-- @manual -->

- ECharts 图表缩放/拖拽交互
- 图表点击事件处理

## 核心函数 (@skill-sig) <!-- @sync -->

- `setupChartInteract(chart: EChartsInstance, container: HTMLElement): void` - 初始化图表交互
- `handleChartZoom(chart: EChartsInstance, params: object): void` - 缩放事件处理
- `handleChartDrag(chart: EChartsInstance, params: object): void` - 拖拽事件处理

## 依赖 <!-- @sync -->

- `echarts` (`.cline/skills/code/echarts/echarts.md`)

## 错误处理 <!-- @sync -->

- 图表实例为空时跳过事件绑定
