// src/util/color-utils.ts

export function isDarkTheme(): boolean {
	const bg = getComputedStyle(document.body)
		.getPropertyValue("--background-primary")
		.trim();
	if (bg.startsWith("#") && bg.length >= 7) {
		const r = parseInt(bg.slice(1, 3), 16);
		const g = parseInt(bg.slice(3, 5), 16);
		const b = parseInt(bg.slice(5, 7), 16);
		return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
	}
	return true;
}

export interface ThemeColor {
	dark: string;
	light: string;
}

export function makeColor(darkColor: string, lightColor: string): ThemeColor {
	return { dark: darkColor, light: lightColor };
}

export function getThemeColor(color: ThemeColor): string {
	return isDarkTheme() ? color.dark : color.light;
}

export function getThemeColorMap(
	defs: Record<string, ThemeColor>,
): Record<string, string> {
	const dark = isDarkTheme();
	const result: Record<string, string> = {};
	for (const [key, color] of Object.entries(defs)) {
		result[key] = dark ? color.dark : color.light;
	}
	return result;
}

export function getThemeColorArray(defs: ThemeColor[]): string[] {
	const dark = isDarkTheme();
	return defs.map((c) => (dark ? c.dark : c.light));
}

export function rgbaToSolidOnDark(rgbaStr: string): string {
	const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
	if (!match) return rgbaStr;
	const r = parseInt(match[1], 10);
	const g = parseInt(match[2], 10);
	const b = parseInt(match[3], 10);
	const a = parseFloat(match[4]);
	const bgR = 30,
		bgG = 30,
		bgB = 30;
	const fr = Math.round((r * a + bgR * (1 - a)) * 0.75);
	const fg = Math.round((g * a + bgG * (1 - a)) * 0.75);
	const fb = Math.round((b * a + bgB * (1 - a)) * 0.75);
	return (
		"#" +
		[fr, fg, fb]
			.map((x) =>
				Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"),
			)
			.join("")
	);
}
