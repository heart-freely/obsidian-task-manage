// src/panel/bars/side-botton-bar.js
export function buildViewSwitcher(container, dv, app, activeType, onActivate) {
    const groups = [
        {
            label: '收集',
            buttons: [
                { icon: '📥', type: 'inbox-task-view', title: '任务收集箱' }
            ]
        },
        {
            label: '整理',
            buttons: [
                { icon: '📂', type: 'organize-task-view', title: '任务整理处' }
            ]
        },
        {
            label: '组织',
            buttons: [
                { icon: '🧩', type: 'matrix-tasks-view', title: '任务矩阵' },
                { icon: '📋', type: 'kanban-task-view', title: '任务看板' },
                { icon: '📊', type: 'gantt-task-view', title: '甘特图' }
            ]
        },
        {
            label: '回顾',
            buttons: [
                { icon: '⭐', type: 'important-task-view', title: '重要任务' },
                { icon: '🔄', type: 'recurring-task-view', title: '循环任务' },
                { icon: '📅', type: 'today-task-view', title: '今天任务' },
                { icon: '🔜', type: 'future-n-task-view', title: '未来 n 天' },
                { icon: '⏳', type: 'future-all-task-view', title: '未来所有任务' },
                { icon: '⏰', type: 'overdue-task-view', title: '逾期任务' },
                { icon: '🔗', type: 'depends-task-view', title: '依赖任务' },
                { icon: '🏷️', type: 'tag-task-view', title: '标签任务' },
                { icon: '🕒', type: 'timeline-task-view', title: '所有任务时间轴' },
                { icon: '📑', type: 'table-task-view', title: '任务表' },
                { icon: '🌲', type: 'tree-task-view', title: '任务树' },
                { icon: '📆', type: 'calendar-task-view', title: '日历图' }
            ]
        },
        {
            label: '统计',
            buttons: [
                { icon: '📈', type: 'task-dataview-view', title: '统计分析' },
                { icon: '🍅', type: 'pomodoro-task-view', title: '番茄钟统计' }
            ]
        }
    ];

    container.innerHTML = '';
    groups.forEach(group => {
        const groupDiv = dv.el('div', '', { cls: 'view-switch-group' });
        groupDiv.style.cssText = 'margin-bottom:12px;';
        const label = dv.el('div', group.label, { cls: 'view-switch-group-label' });
        label.style.cssText = 'font-weight:bold;font-size:0.9em;color:var(--text-accent);margin-bottom:4px;';
        groupDiv.appendChild(label);

        group.buttons.forEach(def => {
            const active = def.type === activeType;
            const btn = dv.el('button', def.icon, {
                cls: 'nav-btn' + (active ? ' nav-btn-active' : ''),
                attr: { title: def.title }
            });
            btn.style.cssText = 'width:36px;height:36px;padding:4px;font-size:18px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;border-radius:8px;cursor:pointer;';
            if (active) { btn.style.background = 'var(--interactive-accent)'; btn.style.color = 'white'; }
            btn.addEventListener('click', () => onActivate(def.type));
            groupDiv.appendChild(btn);
        });
        container.appendChild(groupDiv);
    });
}