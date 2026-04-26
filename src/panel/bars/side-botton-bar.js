// src/panel/panel-sidebar-bottons.js
export function buildViewSwitcher(container, dv, app, activeType, onActivate) {
    const buttons = [
        { icon: '📈', type: 'task-dataview-view', title: '统计分析' },
        { icon: '🧩', type: 'matrix-tasks-view', title: '任务矩阵' },
        // 暂时不添加其他按钮
    ];

    container.innerHTML = '';
    buttons.forEach(def => {
        const active = def.type === activeType;
        const btn = dv.el('button', def.icon, {
            cls: 'nav-btn' + (active ? ' nav-btn-active' : ''),
            attr: { title: def.title }
        });
        btn.style.cssText = 'width:36px; height:36px; padding:4px; font-size:18px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; border-radius:8px; cursor:pointer;';
        if (active) { btn.style.background = 'var(--interactive-accent)'; btn.style.color = 'white'; }
        btn.addEventListener('click', () => onActivate(def.type));
        container.appendChild(btn);
    });
}