export function buildMarkPanel(container, dv, state) {
	const markRow = dv.el("div", "");
	markRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;";

	const allBtn = dv.el("button", "全部", {
		cls: "tag-btn" + (!state.selectedTag ? " tag-btn-active" : ""),
	});
	allBtn.onclick = () => {
		state.selectedTag = "";

		document.querySelectorAll(".tag-btn").forEach((b) => {
			b.classList.remove("tag-btn-active");
		});
		allBtn.classList.add("tag-btn-active");
		state.filterCache.fingerprint = "";
	};
	markRow.appendChild(allBtn);

	state.allTags.forEach((tag) => {
		const btn = dv.el("button", "#" + tag, {
			cls:
				"tag-btn" +
				(state.selectedTag === tag ? " tag-btn-active" : ""),
		});
		btn.onclick = () => {
			state.selectedTag = state.selectedTag === tag ? "" : tag;

			document.querySelectorAll(".tag-btn").forEach((b) => {
				b.classList.remove("tag-btn-active");
			});
			if (state.selectedTag) {
				btn.classList.add("tag-btn-active");
			} else {
				allBtn.classList.add("tag-btn-active");
			}
			state.filterCache.fingerprint = "";
		};
		markRow.appendChild(btn);
	});

	container.appendChild(markRow);
	return markRow;
}

export const buildMarkFilterPanel = buildMarkPanel;
