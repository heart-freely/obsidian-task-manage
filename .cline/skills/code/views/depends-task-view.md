---
name: 任务依赖视图开发
description: 开发或修改依赖关系视图，展示任务间的阻塞与被阻塞关系
triggers:
  - 修改依赖视图
  - 调整依赖解析规则
---

# 任务依赖视图 Skill

## 文件
`src/panel/views/depends-task-view.js`

## 功能
- 解析任务中的 ID 标记（🆔）和依赖标记（⛔），构建依赖图
- 显示阻塞其他任务和被阻塞的任务列表
- 点击跳转源任务

## 实现方式
- 获取所有任务，解析自定义标记 id 和 dependsOn
- 构建 idMap，遍历 dependsOn 建立依赖关系
- 渲染双向列表

## 核心函数
- `buildDependencyGraph(tasks)` → { nodes, edges }

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. 提取每个任务的 id 和 dependsOn 数组
3. 构建 Map<id, task>
4. 对于每个任务，其 dependsOn 中的 id 指向该任务，形成关系
5. 渲染：阻塞者列表、被阻塞者列表

## 关键条件
- 注意循环依赖检测

## 修改指南
- 可改为图形化展示
## AI 命令
生成或修改时：
- 数据源：`readTasks.getAllTasks` 需已解析出 `task.id`、`task.dependsOn` 字段。
- 构建依赖关系：创建 Map，建立双向引用。
- 渲染：展示阻塞链，可使用列表嵌套或简单图形。
- 提示循环依赖。