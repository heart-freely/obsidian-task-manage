import { CONFIG } from "../../../configs/configs";
import { tooltip } from "../tooltip/tooltip";

export function renderTaskTree(
	container: HTMLElement,
	tasks: any[],
	options?: { hideFolders?: boolean },
) {
	container.empty();
	const hideFolders = options?.hideFolders ?? false;

	const fileMap = new Map<string, any[]>();
	tasks.forEach((task) => {
		const path = task.path;
		if (!fileMap.has(path)) fileMap.set(path, []);
		fileMap.get(path)!.push(task);
	});

	const tree = document.createElement("div");
	tree.className = "task-tree";

	fileMap.forEach((tasks, path) => {
		const prefix = "pages/A 系统/A 任务系统/";
		const relPath = path.startsWith(prefix)
			? path.slice(prefix.length)
			: path;
		const parts = relPath.split("/");
		const fileName = parts.pop()?.replace(".md", "") || path;

		const fileNode = document.createElement("div");
		fileNode.className = "tree-file";
		fileNode.style.marginLeft = parts.length * 24 + "px";
		fileNode.innerHTML = `<span class="tree-icon">📄</span> ${fileName} <span class="tree-count">(${tasks.length})</span>`;

		const taskList = document.createElement("div");
		taskList.className = "tree-tasks";

		tasks.forEach((task) => {
			// 简洁样式：只显示状态图标、优先级图标、任务描述，不换行
			const item = document.createElement("div");
			item.className = "tree-task";
			const statusIcon = CONFIG.STATUS_ICONS[task._status] || "🔲";
			const priorityIcon = task._priorityIcon || "";
			const desc = task._cleanText || task.text || "无描述";
			item.textContent = `${statusIcon} ${priorityIcon} ${desc}`;
			item.style.whiteSpace = "nowrap";
			item.style.overflow = "hidden";
			item.style.textOverflow = "ellipsis";
			item.style.cursor = "pointer";

			// 构建 tooltip HTML
			const tipParts: string[] = [];
			if (task._status) tipParts.push("状态：" + task._status);
			if (task._priorityIcon)
				tipParts.push("优先级：" + task._priorityIcon);
			if (task._due) tipParts.push("📅 " + task._due);
			if (task._scheduled) tipParts.push("⏳ " + task._scheduled);
			if (task._id) tipParts.push("🆔 " + task._id);
			if (task._forbid) tipParts.push("⛔ " + task._forbid);
			if (task._tag) tipParts.push("🏁 " + task._tag);
			const tipHtml = tipParts.join("<br>");

			item.addEventListener("mouseenter", (e) => {
				tooltip.show(tipHtml, e.clientX, e.clientY);
			});
			item.addEventListener("mousemove", (e) => {
				tooltip.move(e.clientX, e.clientY);
			});
			item.addEventListener("mouseleave", () => {
				tooltip.hide();
			});

			item.addEventListener("click", () => {
				const app = (window as any).app;
				const file = app?.vault?.getAbstractFileByPath(task.path);
				if (file) {
					app.workspace
						.getLeaf()
						.openFile(file, { eState: { line: task.line } });
				}
			});

			taskList.appendChild(item);
		});

		fileNode.appendChild(taskList);
		tree.appendChild(fileNode);
	});

	container.appendChild(tree);
}
