// src/panel/views/view-list-tasks.js
// 通用列表视图 - 用于任何基于 Tasks 插件的列表展示
import { BaseTaskView } from './base-task-view';

/**
 * 启动通用列表视图
 * @param {Function} fetchFn - 接收 app，返回任务数组的异步函数
 */
export async function startTaskListView(app, container, fetchFn, title = '任务列表') {
    container.innerHTML = '';

    try {
        const tasks = await fetchFn(app);
        if (!tasks.length) {
            container.innerHTML = `<div class="empty-message">📭 暂无${title}</div>`;
            return { cleanup: () => { container.innerHTML = ''; }, updateSort: () => {} };
        }

        const stats = document.createElement('div');
        stats.style.cssText = 'margin-bottom:12px; font-weight:600;';
        stats.textContent = `📋 ${title}：${tasks.length} 项`;
        container.appendChild(stats);

        const ul = document.createElement('ul');
        ul.className = 'task-list';
        ul.style.cssText = 'list-style:none; padding:0;';

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-list-item';
            li.style.cssText = 'padding:6px 10px; margin-bottom:4px; background:var(--background-primary); border-radius:6px; cursor:pointer; border-left:3px solid var(--interactive-accent);';
            
            const prioIcon = { '0':'🔺','1':'⏫','2':'🔼','3':'🔽','4':'⏬' }[task.priority] || '';
            const desc = task.description || '无描述';
            const dueDate = task.dueDate ? ` 📅 ${window.moment(task.dueDate).format('MM-DD')}` : '';
            
            li.innerHTML = `<span style="font-weight:500;">${prioIcon} ${desc}</span><span style="color:var(--text-muted); font-size:0.8em; margin-left:8px;">${dueDate}</span>`;
            
            li.addEventListener('click', async () => {
                const file = app.vault.getAbstractFileByPath(task.path);
                if (file) {
                    const leaf = app.workspace.getLeaf(false);
                    await leaf.openFile(file);
                    setTimeout(() => leaf.view?.editor?.setCursor({ line: task.lineNumber, ch: 0 }), 30);
                }
            });
            ul.appendChild(li);
        });
        container.appendChild(ul);
    } catch (e) {
        container.innerHTML = '<div class="empty-message">⚠️ 获取任务失败，请确认 Tasks 插件已启用</div>';
    }

    return {
        cleanup: () => { container.innerHTML = ''; },
        updateSort: () => {}   // 列表视图暂不参与排序
    };
}