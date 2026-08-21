import { Notice, Plugin } from "obsidian";
import { DataManager } from "../data/data-manager";
import { Store } from "../store/store";
import { AppLike, ManageViewLike } from "../../type/type";

/**
 * 强制重建任务索引：清空全部缓存 → 全量重扫文件 → 刷新所有打开的视图。
 * 与 taskgenius 的 "Force reindex all tasks" 功能对齐。
 */
export async function forceReindexAll(app: AppLike): Promise<void> {
	new Notice("正在清除任务缓存并重建索引...");
	const dataManager = DataManager.getInstance();
	dataManager.invalidate();
	try {
		await dataManager.loadData(app);
		const leaves = app.workspace.getLeavesOfType("manage-view");
		for (const leaf of leaves) {
			const view = (leaf as { view?: ManageViewLike }).view;
			view?.refreshView?.();
		}
		new Notice("任务索引已重建");
	} catch (e: unknown) {
		console.warn("[TaskManage] 重建索引失败:", e);
		new Notice("重建索引失败");
	}
}

export function registerAllCommands(plugin: Plugin, store: Store) {
	plugin.addCommand({
		id: "force-reindex-tasks",
		name: "重建索引（强制重扫全部任务）",
		callback: () => {
			void forceReindexAll(plugin.app as unknown as AppLike);
		},
	});
}
