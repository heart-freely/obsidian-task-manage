// src/core/config/dataview-config.ts

export const DATAVIEW_INLINE_REGEX = /\[([^:]+)::\s*([^\]]+)\]/g;

// eslint-disable-next-line require-unicode-regexp -- 正则已使用 u 标志，ESLint 规则误报
export const DATAVIEW_EMOJI_DATE_REGEX =
	/([\u{1F5D3}\uFE0F\u{1F4C5}\u{2705}\u{2795}\u{1F6EB}\u{23F3}])(\d{4}-\d{2}-\d{2})/gu;

export const DATAVIEW_EMOJI_FIELD_MAP: Record<string, string> = {
	"🗓️": "due",
	"📅": "due",
	"✅": "completion",
	"➕": "created",
	"🛫": "start",
	"⏳": "scheduled",
};
export const DATAVIEW_DATE_FIELDS: Record<string, string> = {
	completion: "done",
	due: "due",
	created: "created",
	start: "starts",
	scheduled: "scheduled",
};
