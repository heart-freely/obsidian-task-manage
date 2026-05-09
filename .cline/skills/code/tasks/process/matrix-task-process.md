---
name: 矩阵任务处理
description: 艾森豪威尔矩阵（重要-紧急四象限）的任务分类和组织逻辑
skill-version: 1.0
triggers:
    - 修改矩阵逻辑
    - 添加矩阵功能
---

# 矩阵任务处理 Skill

## 文件 <!-- @sync -->

`src/tasks/process/matrix-task-process.js`

## 导出 <!-- @sync -->

- `organizeMatrixTasks`
- `getMatrixQuadrants`

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/process/matrix-task-process.js`
- Skill：`.cline/skills/code/tasks/process/matrix-task-process.md`

## 功能 <!-- @manual -->

- 艾森豪威尔矩阵（重要-紧急）四象限分类
- 重要/紧急维度自定义配置

## 核心函数 (@skill-sig) <!-- @sync -->

- `organizeMatrixTasks(tasks: Task[], state: AppState): MatrixData` - 按重要/紧急分类任务到四象限
- `getMatrixQuadrants(): MatrixQuadrant[]` - 获取四象限定义

## 依赖 <!-- @sync -->

- `Task` 类型 (`.cline/skills/code/tasks/tasks.md`)
- `common-process` (`.cline/skills/code/tasks/process/common-process.md`)

## 错误处理 <!-- @sync -->

- 未设置重要/紧急标记的任务归入"不做"象限
