// src/dataview/calcul-dataview.js
var QUERY_CONFIG = {
    TASK_FOLDERS: ['"pages/A 系统/A 任务系统"'],
    FILE_NAME_PATTERN: /任务$/
};

function fetchRawTasks() {
    var state = window.__taskDataViewState;
    if (!state || !state._dvPluginApi) {
        throw new Error('Dataview API 未初始化');
    }
    var rawTasks = [];
    var folders = QUERY_CONFIG.TASK_FOLDERS;
    for (var k = 0; k < folders.length; k++) {
        var folder = folders[k];
        var pages = state._dvPluginApi.pages(folder) || [];
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            if (!QUERY_CONFIG.FILE_NAME_PATTERN.test(page.file.name)) continue;
            if (!page.file.tasks) continue;
            for (var j = 0; j < page.file.tasks.length; j++) {
                var task = page.file.tasks[j];
                task._pagePath = page.file.path;
                task._pageName = page.file.name;
                rawTasks.push(task);
            }
        }
    }
    return rawTasks;
}

function initApi(dvPluginApi) {
    var state = window.__taskDataViewState;
    if (state) {
        state._dvPluginApi = dvPluginApi;
    }
}

module.exports = {
    fetchRawTasks: fetchRawTasks,
    initApi: initApi
};