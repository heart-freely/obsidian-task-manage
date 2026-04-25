// src/views/task-panel-view.js —— 任务面板视图
var { ItemView } = require('obsidian');
var common = require('../common');
var taskEngine = require('../task-engine');
var ui = require('../ui');
var charts = require('../charts');

var VIEW_TYPE = 'task-gantt-view';

var TaskPanelView = (function (_super) {
    function TaskPanelView(leaf) {
        _super.call(this, leaf);
    }
    TaskPanelView.prototype = Object.create(_super.prototype);
    TaskPanelView.prototype.constructor = TaskPanelView;

    TaskPanelView.prototype.getViewType = function () {
        return VIEW_TYPE;
    };
    TaskPanelView.prototype.getDisplayText = function () {
        return '任务面板';
    };
    TaskPanelView.prototype.getIcon = function () {
        return 'bar-chart-3';
    };

    TaskPanelView.prototype.onOpen = async function () {
        var dvPlugin = this.app.plugins.plugins.dataview;
        if (!dvPlugin || !dvPlugin.api) {
            this.contentEl.createEl('div', { text: '⚠️ 请先安装并启用 Dataview 插件。' });
            return;
        }

        // 创建 dv 对象（关键修复）
        var dv = common.createSafeDVObject(dvPlugin.api, this.contentEl);

        // 注入样式，清理旧状态
        common.injectStyles();
        common.cleanupState();

        // 清空容器
        this.contentEl.empty();

        // 将核心刷新函数暴露给 UI 按钮
        var self = this;
        window._taskPanelRenderAll = function () { self.renderAll(dv); };
        window._taskPanelRenderFullUI = function () { self.renderFullUI(dv); };
        window._taskPanelRenderLeftOnly = function () { ui.renderLeftPanelOnly(dv, self.app); };
        window._taskPanelRefreshAll = function () {
            common.state.cachedAllTasks = null;
            common.state.filterCache = { fingerprint: '', tasks: null };
            taskEngine.getAllTasks(dv, true);
            self.renderAll(dv);
        };

        // 初始化数据并渲染
        if (!common.loadFilterState()) {
            var thisWeek = common.DateUtils.getWeekRange(new Date());
            common.state.dateFilterState = { isAll: false, start: thisWeek.start, end: thisWeek.end };
        }
        taskEngine.getAllTasks(dv, true);
        this.renderFullUI(dv);
    };

    TaskPanelView.prototype.onClose = async function () {
        delete window._taskPanelRenderAll;
        delete window._taskPanelRenderFullUI;
        delete window._taskPanelRenderLeftOnly;
        delete window._taskPanelRefreshAll;

        if (common.state.chartInstances) {
            common.state.chartInstances.forEach(function (c) { try { c.dispose(); } catch (e) {} });
        }
        document.querySelectorAll('.gantt-tooltip').forEach(function (el) { el.remove(); });
    };

    // 渲染全部任务列表和图表
    TaskPanelView.prototype.renderAll = function (dv) {
        common.state.filterCache.fingerprint = '';
        var filtered = taskEngine.applyAllFilters(dv);
        var rootNodes = taskEngine.buildTree(filtered, dv);
        taskEngine.sortTreeNodes(rootNodes);
        var flat = [];
        taskEngine.flattenTreeForDisplay(rootNodes, 0, flat);
        common.state.flatDisplayNodes = flat;

        var leftPanel = this.contentEl.querySelector('.left-panel');
        if (leftPanel) {
            ui.renderLeftPanel(leftPanel, flat, dv, this.app);
        }
        if (common.state.chartContainer) {
            charts.renderCharts(common.state.chartContainer, filtered, dv);
        }
        common.saveFilterState();
    };

    // 构建完整 UI
    TaskPanelView.prototype.renderFullUI = function (dv) {
        this.contentEl.innerHTML = '';

        var main = dv.el('div', '');
        main.style.cssText = 'padding:16px 0 16px 2px;';

        ui.buildDateFilterPanel(main, dv);
        ui.buildMarkFilterPanel(main, dv);
        ui.buildControlPanel(main, dv);
        ui.buildSortRow(main, dv);

        var layout = dv.el('div', '', { cls: 'main-layout' });
        var leftDiv = dv.el('div', '', { cls: 'left-panel' });
        var resizer = dv.el('div', '', { cls: 'resizer' });
        var chartDiv = dv.el('div', '', { cls: 'chart-panel' });
        layout.append(leftDiv, resizer, chartDiv);
        main.appendChild(layout);
        this.contentEl.appendChild(main);

        common.state.chartContainer = chartDiv;

        if (common.state.tooltipDiv) common.state.tooltipDiv.remove();
        common.state.tooltipDiv = dv.el('div', '', { cls: 'gantt-tooltip' });
        document.body.appendChild(common.state.tooltipDiv);

        // 拖拽调整宽度
        var self = this;
        var startX, startWidth;
        resizer.addEventListener('mousedown', function (e) {
            startX = e.clientX;
            startWidth = leftDiv.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            var onMove = function (ev) {
                var dx = ev.clientX - startX;
                var newW = Math.max(200, Math.min(600, startWidth + dx));
                leftDiv.style.width = newW + 'px';
                common.state.leftPanelWidth = newW;
                charts.debouncedResize();
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', function () {
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMove);
                common.saveFilterState();
            }, { once: true });
        });

        charts.bindScaleEvents(chartDiv);
        charts.showScaleHint(chartDiv);

        if (common.state.resizeObserver) common.state.resizeObserver.disconnect();
        common.state.resizeObserver = new ResizeObserver(function () { charts.debouncedResize(); });
        common.state.resizeObserver.observe(chartDiv);

        this.renderAll(dv);
    };

    return TaskPanelView;
})(ItemView);

module.exports = { TaskPanelView, VIEW_TYPE };