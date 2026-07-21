// src/util/color-utils.ts
// 颜色工具 — 主题检测、颜色获取

// ========== 主题检测 ==========

/**
 * 检测当前是否为深色主题
 * 通过读取 CSS 变量 --background-primary 的亮度判断
 */
export function isDarkTheme(): boolean {
	const bg = getComputedStyle(document.body)
		.getPropertyValue("--background-primary")
		.trim();
	if (bg.startsWith("#") && bg.length >= 7) {
		const r = parseInt(bg.slice(1, 3), 16);
		const g = parseInt(bg.slice(3, 5), 16);
		const b = parseInt(bg.slice(5, 7), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance < 0.5;
	}
	return true;
}

// ========== 颜色定义类型 ==========

/**
 * 颜色定义：{ dark: 深色主题颜色, light: 浅色主题颜色 }
 */
export interface ThemeColor {
	dark: string;
	light: string;
}

// ========== 颜色获取工具函数 ==========

/**
 * 创建颜色定义对象
 */
export function makeColor(darkColor: string, lightColor: string): ThemeColor {
	return { dark: darkColor, light: lightColor };
}

/**
 * 根据当前主题获取颜色
 */
export function getThemeColor(color: ThemeColor): string {
	return isDarkTheme() ? color.dark : color.light;
}

/**
 * 根据当前主题获取颜色映射
 */
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

/**
 * 根据当前主题获取颜色数组
 */
export function getThemeColorArray(defs: ThemeColor[]): string[] {
	const dark = isDarkTheme();
	return defs.map((c) => (dark ? c.dark : c.light));
}

// ========== Canvas 颜色转换 ==========

/**
 * 将 rgba 颜色叠加在深色背景上，返回等效的不透明 hex 颜色
 * 用于 Canvas/ECharts 等不支持 CSS 背景叠加的渲染环境
 * 深色背景取 #1e1e1e (RGB: 30, 30, 30)
 * 叠加后再将 RGB 各通道乘以衰减系数，使颜色更接近 DOM 元素的实际视觉效果
 */
export function rgbaToSolidOnDark(rgbaStr: string): string {
	const match: RegExpMatchArray | null = rgbaStr.match(
		/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/,
	);
	if (!match) return rgbaStr;

	const r = parseInt(match[1]);
	const g = parseInt(match[2]);
	const b = parseInt(match[3]);
	const a = parseFloat(match[4]);

	const bgR = 30;
	const bgG = 30;
	const bgB = 30;

	const blendedR = r * a + bgR * (1 - a);
	const blendedG = g * a + bgG * (1 - a);
	const blendedB = b * a + bgB * (1 - a);

	const dimFactor = 0.75;
	const finalR = Math.round(blendedR * dimFactor);
	const finalG = Math.round(blendedG * dimFactor);
	const finalB = Math.round(blendedB * dimFactor);

	return (
		"#" +
		[finalR, finalG, finalB]
			.map((x) =>
				Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"),
			)
			.join("")
	);
}
