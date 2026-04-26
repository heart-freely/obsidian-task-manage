// src/panel/views/view-matrix-tasks.js
import { fetchRawTasks, processTasks, sortTasks } from '../../tasks/tasks-matrix';

export async function startMatrixView(app, container) {
    let hideRecurring = true;
    let cachedRawTasks = null;
    let cachedQuadrantsData = null;
    let currentSort = { type: 'status', order: 'asc' };
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
            if (s === 'todo') return '未开始';
            if (s === 'planned') return '计划中';
            if (s === 'in-progress') return '进行中';
            if (s === 'completed') return '已完成';
            if (s === 'cancelled') return '已取消';
            return '';
        }).filter(Boolean);
        if (labels.length === 0) return '全部状态';
        return labels.join(' / ');
    }

    function renderMatrix() {
        if (!cachedQuadrantsData) return;
        // 应用路径筛选
        let quadrantsData = cachedQuadrantsData;
        if (currentFilterRootPath) {
            quadrantsData = quadrantsData.map(tasks =>
                tasks.filter(t => t.path.startsWith(currentFilterRootPath))
            );
        }
        const sortedData = quadrantsData.map(tasks => sortTasks(tasks, currentSort));
        container.innerHTML = '';

        const matrixContainer = document.createElement('div');
        matrixContainer.className = 'matrix-container';

        // 控制栏
        const controlBar = document.createElement('div');
        controlBar.className = 'control-bar';
        const total = sortedData.flat().length;
        const statusText = currentState ? getStatusText(currentState.markFilterState.statuses) : '未开始 / 计划中 / 进行中';
        controlBar.innerHTML = `<strong>📋 总任务: ${total}</strong> (仅${statusText})`;
        matrixContainer.appendChild(controlBar);

        // 四象限网格
        const grid = document.createElement('div');
        grid.className = 'coord-grid';
        QUADRANTS.forEach((quad, idx) => {
            const tasks = sortedData[idx];
            const col = document.createElement('div');
            col.className = 'coord-col';
            col.style.setProperty('--quad-color', quad.color);
            col.innerHTML = `
                <div class="quad-header">
                    <span>${quad.name}</span>
                    <span class="task-count">${tasks.length}</span>
                </div>
                <ul class="quad-list"></ul>
            `;
            const listEl = col.querySelector('.quad-list');
            if (!tasks.length) {
                listEl.innerHTML = `<li class="empty-placeholder">${quad.emptyMsg}</li>`;
            } else {
                listEl.innerHTML = tasks.map(t => `
                    <li class="task-item" data-path="${t.path}" data-line="${t.line}">
                        <div class="task-desc">${t.desc}</div>
                        <div class="task-meta">
                            <span>${t.statusText}</span>
                            ${t.priorityIcon ? `<span>${t.priorityIcon} 优先级</span>` : ''}
                            ${t.scheduled ? `<span>⏳ ${t.scheduled}</span>` : ''}
                            ${t.start ? `<span>🛫 ${t.start}</span>` : ''}
                            ${t.due ? `<span>📅 ${t.due}</span>` : ''}
                            ${t.tags.length ? `<span>🏁 ${t.tags.join(', ')}</span>` : ''}
                            <span>📄 ${t.fileName}</span>
                        </div>
                    </li>
                `).join('');
            }
            grid.appendChild(col);
        });
        matrixContainer.appendChild(grid);

        // 任务点击跳转
        matrixContainer.addEventListener('click', async (e) => {
            const item = e.target.closest('.task-item');
            if (!item) return;
            const file = app.vault.getAbstractFileByPath(item.dataset.path);
            if (file) {
                const leaf = app.workspace.getLeaf(false);
                await leaf.openFile(file);
                setTimeout(() => leaf.view?.editor?.setCursor({ line: parseInt(item.dataset.line), ch: 0 }), 30);
            }
        });

        container.appendChild(matrixContainer);
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
        const { state, leftSort } = params;
        if (state) {
            currentState = state;
            hideRecurring = state.hideRepeatTasks;
            currentFilterRootPath = state.filterRootPath;   // 接收路径聚焦
        }
        if (leftSort) currentSort = leftSort;
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

    return { cleanup: () => { container.innerHTML = ''; }, update };
}