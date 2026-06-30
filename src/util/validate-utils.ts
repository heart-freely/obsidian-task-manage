// src/util/validate-utils.ts
// 安全导入工具 — 类型检查 + 安全合并

/**
 * 安全合并：只合并类型匹配的字段
 * @param target 目标对象
 * @param source 源数据
 * @param schema 字段类型定义 { fieldName: 'string' | 'array' | 'boolean' | 'number' }
 */
export function safeMergeConfig(
	target: any,
	source: any,
	schema: Record<string, string>,
): void {
	for (const [key, expectedType] of Object.entries(schema)) {
		if (source[key] === undefined) continue;

		switch (expectedType) {
			case "array":
				if (Array.isArray(source[key])) {
					target[key] = source[key];
				}
				break;
			case "string":
				if (typeof source[key] === "string") {
					target[key] = source[key];
				}
				break;
			case "boolean":
				if (typeof source[key] === "boolean") {
					target[key] = source[key];
				}
				break;
			case "number":
				if (typeof source[key] === "number" && !isNaN(source[key])) {
					target[key] = source[key];
				}
				break;
		}
	}
}
