---
name: 任务整理箱视图开发
description: 任务标记批量编辑、补全与预览（核心复杂视图）
triggers:
  - 修改整理箱多级筛选
  - 调整编辑预览逻辑
  - 实现撤回与快照
---

# 任务整理箱视图 Skill

## 文件
`src/panel/views/organize-task-view.js`

## 功能
- **多级筛选**：一级（格式完整性）→ 二级（任务状态）→ 三级（标记包含/排除）
- **批量编辑**：补全或修改优先级、循环、日期、旗帜等自定义标记，支持修改和删除
- **预览与确认**：勾选任务后实时预览编辑效果，单行确认或批量保存到文件
- **快照与撤回**：基于 localStorage 存储修改前快照，支持单行和全局撤回
- **自动修复**：根据完成日期逆推补全时间间隔、自动重排标记顺序

## 实现方式
- 数据来源：点击“查询”按钮后调用 `readTasks.getAllTasks`，根据多级筛选条件进行客户端过滤
- 筛选条件综合：一级固定组合（未完成/已完成 与 格式完整/缺失交叉）→ 二级多选状态 → 三级标记包含/排除（互斥）
- 编辑按钮分组：按标记类型生成按钮组，每组支持修改（下拉选择/日期输入）和删除
- 预览累积：后续编辑基于前一次预览结果
- 保存逻辑：单行“确定”仅将预览标记为“已修改”，不写文件；“保存所有修改”批量写入文件并生成快照
- 撤回机制：基于 localStorage 存储的快照，恢复某次批量修改前的任务内容

## 核心函数
- `applyEdit(previewText, action)` → newPreviewText
- `confirmTask(id)`, `saveAll()`
- `revertTask(id)`, `revertAll()`
- `autoFillDates(tasks, n)`
- `autoSortMarks(tasks)`

## DOM 结构
```html
<div class="organize-container">
  <div class="filter-bar">
    <div class="cascade-btn-group" data-level="1">...</div>
    <div class="cascade-btn-group" data-level="2">...</div>
    <div class="cascade-btn-group" data-level="3">...</div>
  </div>
  <div class="edit-panel">
    <div class="edit-group" data-mark="priority">
      <span>优先级 🔺</span>
      <button class="edit-modify-btn">修改</button>
      <button class="edit-delete-btn">删除</button>
      <div class="edit-options hidden">...</div>
    </div>
    <!-- 其他标记分组类似 -->
  </div>
  <div class="task-list-container">
    <div class="pagination-bar">...</div>
    <ul class="task-list">
      <li class="task-item">
        <input type="checkbox" class="task-check">
        <span class="task-desc">...</span>
        <div class="preview-row">📝 预览: ...</div>
        <button class="confirm-btn hidden">确定</button>
        <button class="revert-btn hidden">撤回</button>
      </li>
    </ul>
  </div>
  <div class="action-bar">
    <button class="save-all-btn">保存所有修改</button>
    <button class="clear-preview-btn">清空预览</button>
    <button class="snapshot-revert-btn">快照撤回</button>
  </div>
</div>
```
## ## 状态模型
```js

state = {
  selectedTasks: Set<string>,
  previewCache: Map<string, string>,
  editActions: [],
  currentPage: 1,
  pageSize: 50,
  confirmedTasks: Set<string>, // 已标记为“已修改”的ID
  snapshots: Array<Snapshot>
}
```
## 事件流

    选择一级模式 → 显示/隐藏二、三级按钮组

    点击查询 → 综合筛选条件获取任务列表 → 分页渲染

    勾选任务 → 加入 selectedTasks → 生成默认预览（原文）

    点击编辑按钮 → 展开选项（选择值或日期）→ 选择后执行 applyEdit → 更新预览

    单行确定 → 界面标记已修改，隐藏复选框、显示撤回按钮

    保存所有修改 → 遍历 confirmedTasks，将预览内容写入文件，生成快照

    撤回 → 从快照恢复原始文本或移除已修改状态

## 数据流伪代码

    tasks = getAllTasks(dv, state)

    根据一级模式过滤：未完成/已完成 × 格式完整/缺失

    根据二级状态过滤（多选 AND）

    根据三级标记包含/排除过滤（互斥）

    分页：total > 100 时每页 50 条

    勾选任务：更新 selectedSet，生成预览文本 previewCache

    编辑操作：applyEdit(previewText, action) → 更新 previewCache

    确认单行：界面标记“已修改”，不写文件

    批量保存：previewCache 中所有已确认的任务 → writeTasks.bulkPatch()

    生成快照：createSnapshot() → 存入 localStorage

    撤回：从快照恢复原文，重置状态

## 关键算法复杂度

    过滤：O(n)

    分页：O(1) 切片

    预览文本生成：O(k) k 为勾选任务数

    编辑累积：O(1) 每次操作（字符串替换）

    文件写入：O(k) 批量写入

    快照存储：O(k) 序列化

## 公共调用

    readTasks.getAllTasks

    writeTasks.bulkPatch / createSnapshot

## 关键条件

    编辑操作基于上一次预览结果（非原文）

    快照包含原文、路径、行号

    无完成日期时自动补全逻辑跳过

## 依赖

    BaseTaskView, readTasks, writeTasks

    localStorage

## 修改指南

    增添新标记编辑：在按钮分组配置中添加组，实现 modify/delete

    调整筛选联动：修改一级对应的二三级显示映射
    