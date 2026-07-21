// src/util/performance.ts
// 性能工具

export function throttleByFrame(
	fn: (...args: unknown[]) => void,
): (...args: unknown[]) => void {
	let scheduled = false;
	return function (this: unknown, ...args: unknown[]) {
		if (!scheduled) {
			scheduled = true;
			window.requestAnimationFrame(() => {
				fn.apply(this, args);
				scheduled = false;
			});
		}
	};
}
