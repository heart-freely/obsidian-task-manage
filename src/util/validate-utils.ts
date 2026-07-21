// src/util/validate-utils.ts

export function safeMergeConfig(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	schema: Record<string, string>,
): void {
	for (const [key, expectedType] of Object.entries(schema)) {
		const sourceValue: unknown = source[key];
		if (sourceValue === undefined) continue;

		switch (expectedType) {
			case "array":
				if (Array.isArray(sourceValue)) target[key] = sourceValue;
				break;
			case "string":
				if (typeof sourceValue === "string") target[key] = sourceValue;
				break;
			case "boolean":
				if (typeof sourceValue === "boolean") target[key] = sourceValue;
				break;
			case "number":
				if (typeof sourceValue === "number" && !isNaN(sourceValue))
					target[key] = sourceValue;
				break;
		}
	}
}
