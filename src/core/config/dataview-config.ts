// src/core/config/dataview-config.ts
// Dataview 插件独有格式定义

// ========== Inline 字段 ==========

/** Dataview inline 字段正则: [key:: value] */
export const DATAVIEW_INLINE_REGEX = /\[([^:]+)::\s*([^\]]+)\]/g;

// ========== Emoji 日期简写（Dataview 特有：无空格）==========

/**
 * Dataview emoji 日期简写
 *
 * 格式: emoji + YYYY-MM-DD (无空格)
 * 实例: 🗓️2026-01-15, ✅2026-01-15
 *
 * 与 Tasks 的区别: Tasks 的 emoji 后有空格 (📅 2026-01-15)
 */
export const DATAVIEW_EMOJI_DATE_REGEX =
	/([🗓️📅✅➕🛫⏳])(\d{4}-\d{2}-\d{2})/gu;

/** emoji → 字段名 */
export const DATAVIEW_EMOJI_FIELD_MAP: Record<string, string> = {
	"🗓️": "due",
	"📅": "due",
	"✅": "completion",
	"➕": "created",
	"🛫": "start",
	"⏳": "scheduled",
};

// ========== 日期字段映射 ==========

/**
 * Dataview 原生支持的 5 个日期字段
 */
export const DATAVIEW_DATE_FIELDS: Record<string, string> = {
	completion: "done",
	due: "due",
	created: "created",
	start: "starts",
	scheduled: "scheduled",
};
