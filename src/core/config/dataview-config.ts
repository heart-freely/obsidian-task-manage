// src/core/config/dataview-config.ts

export const DATAVIEW_INLINE_REGEX = /\[([^:]+)::\s*([^\]]+)\]/g;
export const DATAVIEW_EMOJI_DATE_REGEX =
	/([🗓️📅✅➕🛫⏳])(\d{4}-\d{2}-\d{2})/gu;
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
