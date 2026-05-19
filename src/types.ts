// src/types.ts

declare global {
	interface Window {
		moment: any; // 或引入 moment 类型
		echarts: any;
	}
}

export interface TaskItem {
	_status: string;
	_cleanText: string;
	_priorityIcon?: string;
	_due?: string;
	_scheduled?: string;
	path: string;
	line: number;
	// ... 其他字段
}

export interface FilterState {
	dateFilterState: { start: Date | null; end: Date | null; isAll: boolean };
	markFilterState: {
		statuses: string[];
		includeMarks: string[];
		excludeMarks: string[];
	};
	hideRepeatTasks: boolean;
	// ...
}
