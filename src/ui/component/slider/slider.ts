// src/ui/component/slider/slider.ts
// 通用双滑块组件

export interface SliderOptions {
	container: HTMLElement;
	min: number;
	max: number;
	start: number;
	end: number;
	onChange: (start: number, end: number) => void;
	rowCls?: string;
}

export interface SliderRef {
	track: HTMLElement;
	row: HTMLElement;
	startHandle: HTMLElement;
	endHandle: HTMLElement;
	fill: HTMLElement;
}

export interface EnhancedSliderOptions extends SliderOptions {
	format: (v: number) => string;
	todayValue?: number;
	midValue?: number;
	tickStep?: number;
	labelWidth?: string;
}

export interface EnhancedSliderRef {
	row: HTMLElement;
	slider: SliderRef;
	labelSpan: HTMLElement;
	midLine: HTMLElement;
	update: (start: number, end: number) => void;
	destroy: () => void;
}

function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

// ========== 纯滑动条 ==========

export function createSlider(options: SliderOptions): {
	refs: SliderRef;
	update: (start: number, end: number) => void;
	destroy: () => void;
} {
	const { container, min, max, start, end, onChange, rowCls } = options;

	const row = container.createDiv({ cls: rowCls || "slider-row" });
	row.style.cssText = "width:100%;align-items:center;flex-wrap:nowrap;";

	const track = row.createDiv();
	track.style.cssText =
		"flex:1;position:relative;height:4px;cursor:pointer;background:var(--background-modifier-border);border-radius:2px;min-width:60px;overflow:visible;";

	const step = Math.max(1, Math.ceil((max - min) / 20));
	const range = max - min || 1;

	const initS = clamp(Math.round(Math.min(start, end)), min, max);
	const initE = clamp(Math.round(Math.max(start, end)), min, max);

	const sp = ((initS - min) / range) * 100;
	const ep = ((initE - min) / range) * 100;
	const fill = track.createDiv();
	fill.style.cssText = `position:absolute;top:0;left:${sp}%;width:${Math.max(0, ep - sp)}%;height:100%;background:var(--interactive-accent);border-radius:2px;`;

	const createHandle = (pct: number, isStart: boolean): HTMLElement => {
		const el = track.createDiv();
		const radius = isStart ? "3px 0 0 3px" : "0 3px 3px 0";
		const translate = isStart ? "translateX(-100%)" : "translateX(0)";
		el.style.cssText = `position:absolute;top:-6px;left:${pct}%;width:4px;height:16px;background:var(--interactive-accent);border-radius:${radius};cursor:grab;transform:${translate};z-index:2;`;
		return el;
	};

	const startHandle = createHandle(sp, true);
	const endHandle = createHandle(ep, false);

	let cs = initS;
	let ce = initE;
	let isDraggingHandle = false;
	let isDraggingRange = false;

	const updateHandles = (ns: number, ne: number) => {
		const mnv = clamp(Math.min(ns, ne), min, max);
		const mxv = clamp(Math.max(ns, ne), min, max);
		startHandle.style.left = `${((mnv - min) / range) * 100}%`;
		endHandle.style.left = `${((mxv - min) / range) * 100}%`;
		fill.style.left = `${((mnv - min) / range) * 100}%`;
		fill.style.width = `${((mxv - mnv) / range) * 100}%`;
	};

	const commitChange = (ns: number, ne: number) => {
		const mnv = clamp(Math.round(Math.min(ns, ne)), min, max);
		const mxv = clamp(Math.round(Math.max(ns, ne)), min, max);
		cs = mnv;
		ce = mxv;
		updateHandles(cs, ce);
		onChange(cs, ce);
	};

	const bindDrag = (el: HTMLElement, isStart: boolean) => {
		el.onmousedown = (ev: MouseEvent) => {
			ev.preventDefault();
			ev.stopPropagation();
			isDraggingHandle = true;
			el.style.cursor = "grabbing";

			const onMove = (e: MouseEvent) => {
				if (!isDraggingHandle) return;
				const rect = track.getBoundingClientRect();
				const raw = Math.max(
					0,
					Math.min(1, (e.clientX - rect.left) / rect.width),
				);
				let v = Math.round(min + raw * range);
				v = clamp(v, min, max);
				if (isStart) {
					cs = clamp(Math.min(v, ce), min, max);
				} else {
					ce = clamp(Math.max(v, cs), min, max);
				}
				updateHandles(cs, ce);
			};

			const onUp = (e: MouseEvent) => {
				if (!isDraggingHandle) return;
				isDraggingHandle = false;
				el.style.cursor = "grab";
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				e.preventDefault();
				e.stopPropagation();
				commitChange(cs, ce);
			};

			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		};
	};

	bindDrag(startHandle, true);
	bindDrag(endHandle, false);

	track.onmousedown = (ev: MouseEvent) => {
		const target = ev.target as HTMLElement;
		if (target === startHandle || target === endHandle) return;
		const rect = track.getBoundingClientRect();
		const raw = Math.max(
			0,
			Math.min(1, (ev.clientX - rect.left) / rect.width),
		);
		const clickVal = Math.round(min + raw * range);
		if (clickVal >= cs && clickVal <= ce && ce - cs >= step) {
			ev.preventDefault();
			isDraggingRange = true;
			const startCs = cs;
			const startCe = ce;
			const startX = ev.clientX;

			const onMove = (e: MouseEvent) => {
				if (!isDraggingRange) return;
				const dx = e.clientX - startX;
				const rawDx = Math.round((dx / track.offsetWidth) * range);
				let newCs = startCs + rawDx;
				let newCe = startCe + rawDx;
				if (newCs < min) {
					newCe = min + (startCe - startCs);
					newCs = min;
				}
				if (newCe > max) {
					newCs = max - (startCe - startCs);
					newCe = max;
				}
				newCs = clamp(newCs, min, max);
				newCe = clamp(newCe, min, max);
				cs = newCs;
				ce = newCe;
				updateHandles(cs, ce);
			};

			const onUp = () => {
				if (!isDraggingRange) return;
				isDraggingRange = false;
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				commitChange(cs, ce);
			};

			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		}
	};

	track.onclick = (ev: MouseEvent) => {
		if (isDraggingHandle || isDraggingRange) return;
		if (ev.target === startHandle || ev.target === endHandle) return;
		const rect = track.getBoundingClientRect();
		const raw = Math.max(
			0,
			Math.min(1, (ev.clientX - rect.left) / rect.width),
		);
		let v = Math.round(min + raw * range);
		v = clamp(v, min, max);
		if (v >= cs && v <= ce && cs !== ce) return;
		if (Math.abs(v - cs) <= Math.abs(v - ce)) {
			cs = clamp(Math.min(v, ce), min, max);
		} else {
			ce = clamp(Math.max(v, cs), min, max);
		}
		commitChange(cs, ce);
	};

	return {
		refs: { track, row, startHandle, endHandle, fill },
		update: (ns: number, ne: number) => {
			const mnv = clamp(Math.round(Math.min(ns, ne)), min, max);
			const mxv = clamp(Math.round(Math.max(ns, ne)), min, max);
			cs = mnv;
			ce = mxv;
			updateHandles(cs, ce);
		},
		destroy: () => row.remove(),
	};
}

// ========== 增强滑动条 ==========

export function createEnhancedSlider(options: EnhancedSliderOptions): {
	refs: EnhancedSliderRef;
	updateMidLine: (value: number) => void;
	updateLabel: (text: string) => void;
} {
	const {
		container,
		min,
		max,
		start,
		end,
		format,
		onChange,
		todayValue,
		midValue,
		tickStep,
		labelWidth,
		rowCls,
	} = options;

	const outerRow = container.createDiv({ cls: rowCls || "filter-row" });
	outerRow.style.cssText = "width:100%;align-items:center;flex-wrap:nowrap;";

	const range = max - min || 1;
	const step = tickStep ?? Math.max(1, Math.ceil((max - min) / 20));

	const trackWrapper = outerRow.createDiv();
	trackWrapper.style.cssText = "flex:1;position:relative;min-width:60px;";

	// 右侧文字
	const labelSpan = outerRow.createSpan();
	labelSpan.style.cssText = `
		font-size:var(--font-ui-smaller);
		width:${labelWidth || "160px"};
		min-width:${labelWidth || "160px"};
		max-width:${labelWidth || "160px"};
		text-align:left;
		flex-shrink:0;
		color:var(--text-muted);
		white-space:nowrap;
		overflow:hidden;
		text-overflow:ellipsis;
	`;

	const initS = clamp(Math.min(start, end), min, max);
	const initE = clamp(Math.max(start, end), min, max);
	labelSpan.textContent =
		initS === initE ? format(initS) : `${format(initS)}~${format(initE)}`;

	const wrappedOnChange = (s: number, e: number) => {
		const cs = clamp(Math.min(s, e), min, max);
		const ce = clamp(Math.max(s, e), min, max);
		labelSpan.textContent =
			cs === ce ? format(cs) : `${format(cs)}~${format(ce)}`;
		onChange(cs, ce);
	};

	const slider = createSlider({
		container: trackWrapper,
		min,
		max,
		start: initS,
		end: initE,
		onChange: wrappedOnChange,
		rowCls: "slider-inner-row",
	});
	slider.refs.row.style.cssText = "width:100%;";

	// 刻度标记放在实际轨道 slider.refs.track 中
	const track = slider.refs.track;
	for (let v = min; v <= max; v += step) {
		const isToday = todayValue !== undefined && v === todayValue;
		const mark = track.createDiv();
		mark.style.cssText = `position:absolute;top:0;left:${((v - min) / range) * 100}%;transform:translateX(-50%);width:${isToday ? "2px" : "1px"};height:8px;background:${isToday ? "var(--text-accent)" : "var(--text-muted)"};opacity:${isToday ? "1" : "0.4"};z-index:1;`;
	}
	if (
		todayValue !== undefined &&
		todayValue >= min &&
		todayValue <= max &&
		(todayValue - min) % step !== 0
	) {
		const mark = track.createDiv();
		mark.style.cssText = `position:absolute;top:0;left:${((todayValue - min) / range) * 100}%;transform:translateX(-50%);width:2px;height:8px;background:var(--text-accent);opacity:1;z-index:1;`;
	}

	// 中位线放在实际轨道中
	const midLine = track.createDiv();
	midLine.style.cssText =
		"position:absolute;top:-2px;width:1px;height:8px;background:var(--text-muted);opacity:0.5;z-index:1;";
	if (midValue !== undefined) {
		midLine.style.left = `${((clamp(midValue, min, max) - min) / range) * 100}%`;
	} else {
		midLine.style.display = "none";
	}

	const updateAll = (s: number, e: number) => {
		const cs = clamp(Math.min(s, e), min, max);
		const ce = clamp(Math.max(s, e), min, max);
		slider.update(cs, ce);
		labelSpan.textContent =
			cs === ce ? format(cs) : `${format(cs)}~${format(ce)}`;
	};

	return {
		refs: {
			row: outerRow,
			slider: slider.refs,
			labelSpan,
			midLine,
			update: updateAll,
			destroy: () => {
				slider.destroy();
				outerRow.remove();
			},
		},
		updateMidLine: (value: number) => {
			midLine.style.left = `${((clamp(value, min, max) - min) / range) * 100}%`;
			midLine.style.display = "";
		},
		updateLabel: (text: string) => {
			labelSpan.textContent = text;
		},
	};
}
