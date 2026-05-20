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

		if (hideFolders) {
			const fileNode = document.createElement("div");
			fileNode.className = "tree-file";
			fileNode.innerHTML = `<span class="tree-icon">📄</span> ${fileName} <span class="tree-count">(${tasks.length})</span>`;
			const taskList = document.createElement("div");
			taskList.className = "tree-tasks";
			tasks.forEach((task) => {
				const item = document.createElement("div");
				item.className = "tree-task";
				item.textContent = `${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}`;

				const tipHtml = buildTooltipHtml(task);
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
					if (file)
						app.workspace
							.getLeaf()
							.openFile(file, { eState: { line: task.line } });
				});
				taskList.appendChild(item);
			});
			fileNode.appendChild(taskList);
			tree.appendChild(fileNode);
		} else {
			let parent = tree;
			parts.forEach((part) => {
				const currentPath =
					prefix + parts.slice(0, parts.indexOf(part) + 1).join("/");
				let folder = parent.querySelector(
					`[data-folder="${currentPath}"]`,
				) as HTMLElement;
				if (!folder) {
					folder = document.createElement("div");
					folder.className = "tree-folder";
					folder.setAttribute("data-folder", currentPath);
					folder.innerHTML = `<span class="tree-icon">📁</span> ${part}`;
					parent.appendChild(folder);
				}
				parent = folder;
			});

			const fileNode = document.createElement("div");
			fileNode.className = "tree-file";
			fileNode.style.marginLeft = parts.length * 24 + "px";
			fileNode.innerHTML = `<span class="tree-icon">📄</span> ${fileName} <span class="tree-count">(${tasks.length})</span>`;
			const taskList = document.createElement("div");
			taskList.className = "tree-tasks";
			tasks.forEach((task) => {
				const item = document.createElement("div");
				item.className = "tree-task";
				item.textContent = `${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}`;

				const tipHtml = buildTooltipHtml(task);
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
					if (file)
						app.workspace
							.getLeaf()
							.openFile(file, { eState: { line: task.line } });
				});
				taskList.appendChild(item);
			});
			fileNode.appendChild(taskList);
			parent.appendChild(fileNode);
		}
	});

	container.appendChild(tree);
}

function buildTooltipHtml(task: any): string {
	const parts: string[] = [];
	if (task._status) parts.push("状态：" + task._status);
	if (task._priorityIcon) parts.push("优先级：" + task._priorityIcon);
	if (task._due) parts.push("📅 " + task._due);
	if (task._scheduled) parts.push("⏳ " + task._scheduled);
	if (task._id) parts.push("🆔 " + task._id);
	if (task._forbid) parts.push("⛔ " + task._forbid);
	if (task._tag) parts.push("🏁 " + task._tag);
	return parts.join("<br>");
}
