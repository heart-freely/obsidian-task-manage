// src/util/performance.ts
// 性能工具

export function throttleByFrame(
	fn: (...args: any[]) => void,
): (...args: any[]) => void {
	let scheduled = false;
	return function (this: any, ...args: any[]) {
		if (!scheduled) {
			scheduled = true;
			requestAnimationFrame(() => {
				fn.apply(this, args);
				scheduled = false;
			});
		}
	};
}
