// src/panel/views/matrix-task-view.js
import { fetchRawTasks, processTasks, sortTasks } from '../../tasks/process/matrix-task-process';
import { createTaskCard, normalizeTaskCardData } from './base-task-view';

export async function startMatrixView(app, container, leftSort, state = {}) {
    let hideRecurring = state.hideRecurring || false;
    let cachedRawTasks = null;
    let cachedQuadrantsData = null;
    let currentSort = leftSort || { type: 'status', order: 'asc' };
    let currentState = null;
    let currentFilterRootPath = null;

    const QUADRANTS = [
        { name: "🔺 紧急与重要", color: "rgba(255, 130, 130, 0.25)", emptyMsg: "🎯 暂无紧急重要任务，保持专注！" },
        { name: "⏫ 不紧急且重要", color: "rgba(255, 180, 100, 0.25)", emptyMsg: "📌 暂无重要不紧急任务，可以规划长期目标" },
        { name: "🔼 紧急且不重要", color: "rgba(200, 200, 200, 0.15)", emptyMsg: "⚡ 暂无紧急不重要任务，试着减少干扰" },
        { name: "🔽⏬️ 不紧急也不重要", color: "rgba(100, 180, 255, 0.2)", emptyMsg: "📎 暂无不重要不紧急任务，合理放松" }
    ];

    function normalizePath(p) { return (p || '').replace(/\.md$/, ''); }

    function renderMatrix() {
        if (!cachedQuadrantsData) return;
        let quadrantsData = cachedQuadrantsData;
        if (currentFilterRootPath) {
            const normalizedFilter = normalizePath(currentFilterRootPath);
            quadrantsData = quadrantsData.map(tasks =>
                tasks.filter(t => normalizePath(t.path).startsWith(normalizedFilter))
            );
        }
        const sortedData = quadrantsData.map(tasks => sortTasks(tasks, currentSort));
        container.innerHTML = '';

        const controlBar = document.createElement('div');
        controlBar.className = 'control-bar';
        const total = sortedData.flat().length;
        const statusText = currentState
            ? currentState.markFilterState.statuses.join(' / ')
            : '未开始 / 计划中 / 进行中';
        controlBar.innerHTML = `<strong>📋 总任务: ${total}</strong> (仅${statusText})`;
        container.appendChild(controlBar);

        const grid = document.createElement('div');
        grid.className = 'view-grid cols-2';

        QUADRANTS.forEach((quad, idx) => {
            const tasks = sortedData[idx];
            const col = document.createElement('div');
            col.className = 'view-col';
            col.style.setProperty('--quad-color', quad.color);
            col.style.maxHeight = '400px';  // 恢复高度限制

            const header = document.createElement('div');
            header.className = 'col-header';
            header.innerHTML = `
                <span>${quad.name}</span>
                <span class="task-count">${tasks.length}</span>
            `;
            col.appendChild(header);

            const list = document.createElement('ul');
            list.className = 'task-list';

            if (!tasks.length) {
                list.innerHTML = `<li class="empty-placeholder">${quad.emptyMsg}</li>`;
            } else {
                tasks.forEach(t => {
                    const cardData = normalizeTaskCardData({
                        description: t.desc,
                        priority: String(t.priorityNum === 5 ? 'none' : t.priorityNum),
                        status: t._status,
                        scheduled: t.scheduled,
                        start: t.start,
                        due: t.due,
                        tags: t.tags,
                        fileName: t.fileName,
                        path: t.path,
                        lineNumber: t.line
                    });
                    const card = createTaskCard(cardData, app);
                    list.appendChild(card);
                });
            }
            col.appendChild(list);
            grid.appendChild(col);
        });
        container.appendChild(grid);
    }

    async function init() {
        try {
            cachedRawTasks = await fetchRawTasks(app);
            cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
            renderMatrix();
        } catch (e) {
            container.innerHTML = '<div class="empty-placeholder">❌ 未检测到 Tasks 插件</div>';
        }
    }

    async function update(params) {
        const { state: newState, leftSort: newSort } = params;
        if (newState) {
            currentState = newState;
            hideRecurring = newState.hideRepeatTasks;
            currentFilterRootPath = newState.filterRootPath;
        }
        if (newSort) currentSort = newSort;
        if (cachedRawTasks) {
            cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
        } else {
            try {
                cachedRawTasks = await fetchRawTasks(app);
                cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
            } catch (e) {}
        }
        renderMatrix();
    }

    await init();

    return {
        cleanup: () => { container.innerHTML = ''; },
        updateSort: (newSort) => { currentSort = newSort || currentSort; renderMatrix(); }
    };
}