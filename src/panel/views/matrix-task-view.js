// src/panel/views/matrix-task-view.js
import { fetchRawTasks, processTasks, sortTasks } from '../../tasks/process/matrix-task-process';

/**
 * @param {Obsidian.App} app
 * @param {HTMLElement} container
 * @param {Object} sharedSort 共享排序对象 { type, order }，必须传入
 * @param {Object} [state] 初始状态
 */
export async function startMatrixView(app, container, sharedSort, state = {}) {
    // 直接使用传入的共享排序对象，不要创建副本
    const currentSort = sharedSort;

    let hideRecurring = state.hideRecurring || false;
    let cachedRawTasks = null;
    let cachedQuadrantsData = null;
    let currentState = null;
    let currentFilterRootPath = null;

    const QUADRANTS = [
        { name: "🔺 紧急与重要", color: "rgba(255, 130, 130, 0.25)", emptyMsg: "🎯 暂无紧急重要任务，保持专注！" },
        { name: "⏫ 不紧急且重要", color: "rgba(255, 180, 100, 0.25)", emptyMsg: "📌 暂无重要不紧急任务，可以规划长期目标" },
        { name: "🔼 紧急且不重要", color: "rgba(200, 200, 200, 0.15)", emptyMsg: "⚡ 暂无紧急不重要任务，试着减少干扰" },
        { name: "🔽⏬️ 不紧急也不重要", color: "rgba(100, 180, 255, 0.2)", emptyMsg: "📎 暂无不重要不紧急任务，合理放松" }
    ];

    function getStatusText(statuses) {
        const labels = statuses.map(s => {
            if (s === 'todo') return '未开始'; if (s === 'planned') return '计划中'; if (s === 'in-progress') return '进行中';
            if (s === 'completed') return '已完成'; if (s === 'cancelled') return '已取消'; return '';
        }).filter(Boolean);
        return labels.length ? labels.join(' / ') : '全部状态';
    }

    function normalizePath(p) { return (p || '').replace(/\.md$/, ''); }

    async function renderMatrix() {
        if (!cachedQuadrantsData) {
            // 数据还未加载，尝试初始化
            try {
                cachedRawTasks = await fetchRawTasks(app);
                cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
            } catch (e) {
                container.innerHTML = '<div class="empty-placeholder">❌ 未检测到 Tasks 插件</div>';
                return;
            }
        }

        // 应用路径筛选
        let quadrantsData = cachedQuadrantsData;
        if (currentFilterRootPath) {
            const normalizedFilter = normalizePath(currentFilterRootPath);
            quadrantsData = quadrantsData.map(tasks =>
                tasks.filter(t => normalizePath(t.path).startsWith(normalizedFilter))
            );
        }

        // 根据 sharedSort 排序（此时 currentSort === sharedSort）
        const sortedData = quadrantsData.map(tasks => sortTasks(tasks, currentSort));

        container.innerHTML = '';
        const matrixContainer = document.createElement('div'); matrixContainer.className = 'matrix-container';
        const controlBar = document.createElement('div'); controlBar.className = 'control-bar';
        const total = sortedData.flat().length;
        const statusText = currentState ? getStatusText(currentState.markFilterState.statuses) : '未开始 / 计划中 / 进行中';
        controlBar.innerHTML = `<strong>📋 总任务: ${total}</strong> (仅${statusText})`;
        matrixContainer.appendChild(controlBar);

        const grid = document.createElement('div'); grid.className = 'coord-grid';
        QUADRANTS.forEach((quad, idx) => {
            const tasks = sortedData[idx];
            const col = document.createElement('div'); col.className = 'coord-col'; col.style.setProperty('--quad-color', quad.color);
            col.innerHTML = `<div class="quad-header"><span>${quad.name}</span><span class="task-count">${tasks.length}</span></div><ul class="quad-list"></ul>`;
            const listEl = col.querySelector('.quad-list');
            if (!tasks.length) listEl.innerHTML = `<li class="empty-placeholder">${quad.emptyMsg}</li>`;
            else listEl.innerHTML = tasks.map(t => `
                <li class="task-item" data-path="${t.path}" data-line="${t.line}">
                    <div class="task-desc">${t.desc}</div>
                    <div class="task-meta">
                        <span>${t.statusText}</span>${t.priorityIcon ? `<span>${t.priorityIcon} 优先级</span>` : ''}
                        ${t.scheduled ? `<span>⏳ ${t.scheduled}</span>` : ''}${t.start ? `<span>🛫 ${t.start}</span>` : ''}
                        ${t.due ? `<span>📅 ${t.due}</span>` : ''}${t.tags.length ? `<span>🏁 ${t.tags.join(', ')}</span>` : ''}
                        <span>📄 ${t.fileName}</span>
                    </div>
                </li>`).join('');
            grid.appendChild(col);
        });
        matrixContainer.appendChild(grid);

        matrixContainer.addEventListener('click', async (e) => {
            const item = e.target.closest('.task-item'); if (!item) return;
            const file = app.vault.getAbstractFileByPath(item.dataset.path);
            if (file) { const leaf = app.workspace.getLeaf(false); await leaf.openFile(file); setTimeout(() => leaf.view?.editor?.setCursor({ line: parseInt(item.dataset.line), ch: 0 }), 30); }
        });

        container.appendChild(matrixContainer);
    }

    // 获取外部状态更新的函数
    async function update(params) {
        const { state: newState, leftSort } = params;
        if (newState) {
            currentState = newState;
            hideRecurring = newState.hideRepeatTasks;
            currentFilterRootPath = newState.filterRootPath;
        }
        if (leftSort) {
            // 修改共享对象的值，同步到 currentSort (它们指向同一对象，通常已经同步)
            currentSort.type = leftSort.type;
            currentSort.order = leftSort.order;
        }
        // 重新处理数据（如果有新数据）
        if (cachedRawTasks) {
            cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
        }
        await renderMatrix();
    }

    // 排序变化时直接调用 renderMatrix，因为 currentSort 已经是共享对象
    async function updateSort() {
        await renderMatrix();
    }

    // 初始加载
    try {
        cachedRawTasks = await fetchRawTasks(app);
        cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
        await renderMatrix();
    } catch (e) {
        container.innerHTML = '<div class="empty-placeholder">❌ 未检测到 Tasks 插件</div>';
    }

    return { cleanup: () => { container.innerHTML = ''; }, updateSort };
}