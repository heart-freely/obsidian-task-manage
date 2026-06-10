// src/util/dom-utils.ts
// DOM 工具

export function createEl(
	tag: string,
	textOrOpts?: string | Record<string, any>,
	opts?: { cls?: string; style?: string; attr?: Record<string, string> },
): HTMLElement {
	const el = document.createElement(tag);
	if (typeof textOrOpts === "string") {
		el.textContent = textOrOpts;
	} else if (textOrOpts && typeof textOrOpts === "object") {
		Object.assign(el, textOrOpts);
	}
	if (opts && typeof opts === "object") {
		if (opts.cls) el.className = opts.cls;
		if (opts.style) el.style.cssText = opts.style;
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
