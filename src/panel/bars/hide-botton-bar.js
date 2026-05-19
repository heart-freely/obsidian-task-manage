// src/panel/panel-hide-bottons.js
export function buildHideButtons(container, dv, state, callbacks = {}) {
	const filterBtn = dv.el(
		"button",
		state.showFilters ? "👁 隐藏筛选" : "👁 显示筛选",
		{ cls: "quick-btn" + (state.showFilters ? " quick-btn-active" : "") },
	);
	filterBtn.onclick = () => {
		state.showFilters = !state.showFilters;
		if (callbacks.onToggleFilters) callbacks.onToggleFilters();
	};
	container.appendChild(filterBtn);

	const treeBtn = dv.el(
		"button",
		state.showTree ? "🌲 隐藏树" : "🌲 显示树",
		{ cls: "quick-btn" + (state.showTree ? " quick-btn-active" : "") },
	);
	treeBtn.onclick = () => {
		state.showTree = !state.showTree;
		if (callbacks.onToggleTree) callbacks.onToggleTree();
	};
	container.appendChild(treeBtn);
}
