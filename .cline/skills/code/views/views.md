---
name: 视图注册中心
description: 统一导出所有视图类型和注册逻辑
skill-version: 4.0
triggers:
  - 修改视图注册
  - 添加新视图
---

# 视图注册中心 Skill

## 文件 <!-- @sync -->
`src/panel/views/views.js`

## 导出 <!-- @sync -->
- `VIEW_TYPES`
- `registerViews`
- `getViewInstance`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/views.js`
- Skill：`.cline/skills/code/views/views.md`

## 功能 <!-- @manual -->
- 聚合所有视图模块
- 提供注册和获取视图实例的统一接口

## 实现方式 <!-- @sync -->
- 导入各视图类，导出映射表
- 注册到 Obsidian 视图注册表

## 核心函数 (@skill-sig) <!-- @sync -->
- `registerViews(plugin: Plugin): void`
- `getViewInstance(type: string): ItemView`

## 状态模型 <!-- @sync -->
无内部状态

## 事件流 <!-- @sync -->
插件加载 → 调用 `registerViews` → 注册所有视图

## 依赖 <!-- @sync -->
- 各视图 Skill 文件（见列表）

## 修改指南 <!-- @auto-record -->
- 2026-05-07: v4.0 初始化