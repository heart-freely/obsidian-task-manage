// src/util/dom-utils.ts
// DOM 工具

export function createEl(
	tag: string,
	textOrOpts?: string | Record<string, unknown>,
	opts?: { cls?: string; attr?: Record<string, string> },
): HTMLElement {
	const el = document.createElement(tag);
	if (typeof textOrOpts === "string") {
		el.textContent = textOrOpts;
	} else if (textOrOpts && typeof textOrOpts === "object") {
		Object.assign(el, textOrOpts as Record<string, unknown>);
	}
	if (opts && typeof opts === "object") {
		if (opts.cls) el.className = opts.cls;
		if (opts.attr) {
			for (const key in opts.attr) {
				if (Object.prototype.hasOwnProperty.call(opts.attr, key)) {
					el.setAttribute(key, opts.attr[key]);
				}
			}
		}
	}
	return el;
}
