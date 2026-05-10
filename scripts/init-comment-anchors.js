/**
 * 初始化注释锚点脚本（稳定版）
 * 自动扫描 src 下所有 .js 文件，
 * 提取所有 @skill-* 和 @skill-anchor 注释，
 * 每个标签生成独立的 commentGroup，comment 仅包含对应片段。
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const CACHE_PATH = path.join(ROOT, ".cline/skills/cache/code_cache.json");

// 读取已有缓存（保留 lastModified 等信息）
let existingCache = {
	version: "1.0",
	code: new Date().toISOString(),
	comments: [],
};
try {
	if (fs.existsSync(CACHE_PATH)) {
		existingCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
		if (!existingCache.comments) existingCache.comments = [];
	}
} catch (e) {
	/* 新建 */
}

const existingMap = {};
for (const entry of existingCache.comments) {
	existingMap[entry.path] = entry;
}

// ===== 黑名单（过滤脚本自身注释，不会误杀头部注释） =====
const COMMENT_BLACKLIST = [
	"初始化注释锚点脚本",
	"扫描所有 skills-index.json 中已映射的 JS 文件",
	"提取所有 @skill-* 和 @skill-anchor 注释及其行号",
	"写入 .cline/skills/cache/code_cache.json",
	"从 JS 文件内容中提取 @skill-* 和 @skill-anchor 注释",
];

function isBlacklisted(text) {
	return COMMENT_BLACKLIST.some((kw) => text.includes(kw));
}

function isLineComment(line, idx) {
	if (idx === 0) return true;
	const ch = line[idx - 1];
	return " \t;,()[]{} +-*%&|!~=<>?:.".includes(ch);
}

/**
 * 从文本中精确拆分每个 @skill-* / @skill-anchor 标签，
 * 返回 { line, comment } 数组，每个 comment 只包含一个标签开始的片段。
 */
function splitByLabels(text, baseLine) {
	const segments = [];
	// 先用普通正则收集所有匹配的索引位置
	const regex = /@skill-(?!anchor\b)|@skill-anchor/g;
	const matches = [];
	let m;
	while ((m = regex.exec(text)) !== null) {
		matches.push({ start: m.index, label: m[0] });
	}
	// 无匹配则返回空
	if (matches.length === 0) return [];
	// 计算每个片段的起止位置
	for (let i = 0; i < matches.length; i++) {
		const startPos = matches[i].start;
		// 片段结束位置：下一个标签的开始位置，或文本末尾
		const endPos =
			i + 1 < matches.length ? matches[i + 1].start : text.length;
		const segment = text.slice(startPos, endPos).trimEnd();
		// 计算行号
		const preceding = text.slice(0, startPos);
		const lineNum = baseLine + (preceding.match(/\n/g) || []).length;
		segments.push({ line: lineNum, comment: segment });
	}
	return segments;
}

/**
 * 从 JS 源文件中提取所有 @skill-* / @skill-anchor 注释。
 */
function extractComments(content) {
	const lines = content.split("\n");
	const commentBlocks = []; // { startLine, text }
	let inBlockComment = false;
	let blockLines = [];
	let blockStart = -1;

	for (let i = 0; i < lines.length; i++) {
		const lineNum = i + 1;
		const line = lines[i];

		if (inBlockComment) {
			blockLines.push(line);
			if (line.includes("*/")) {
				inBlockComment = false;
				const fullText = blockLines.join("\n");
				if (
					!isBlacklisted(fullText) &&
					/@skill-(?!anchor\b)|@skill-anchor/.test(fullText)
				) {
					commentBlocks.push({
						startLine: blockStart,
						text: fullText,
					});
				}
				blockLines = [];
				blockStart = -1;
			}
			continue;
		}

		// 行注释 //
		const singleIdx = line.indexOf("//");
		if (singleIdx !== -1 && isLineComment(line, singleIdx)) {
			const commentText = line.slice(singleIdx);
			if (
				!isBlacklisted(commentText) &&
				/@skill-(?!anchor\b)|@skill-anchor/.test(commentText)
			) {
				commentBlocks.push({ startLine: lineNum, text: commentText });
			}
			continue;
		}

		// 块注释开始 /*
		if (line.includes("/*")) {
			inBlockComment = true;
			blockLines = [line];
			blockStart = lineNum;
			if (line.includes("*/")) {
				inBlockComment = false;
				const fullText = blockLines.join("\n");
				if (
					!isBlacklisted(fullText) &&
					/@skill-(?!anchor\b)|@skill-anchor/.test(fullText)
				) {
					commentBlocks.push({
						startLine: blockStart,
						text: fullText,
					});
				}
				blockLines = [];
				blockStart = -1;
			}
		}
	}

	// 对每个注释块精确拆分标签
	const result = [];
	for (const block of commentBlocks) {
		const segments = splitByLabels(block.text, block.startLine);
		result.push(...segments);
	}
	return result;
}

function getFileHash(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const chr = content.charCodeAt(i);
			hash = (hash << 5) - hash + chr;
			hash |= 0;
		}
		return Math.abs(hash).toString(16);
	} catch (e) {
		return "unknown";
	}
}

// ===== 递归获取所有 JS 文件 =====
function getAllJSFiles(dir) {
	const results = [];
	const list = fs.readdirSync(dir, { withFileTypes: true });
	for (const dirent of list) {
		const fullPath = path.join(dir, dirent.name);
		if (dirent.isDirectory()) {
			results.push(...getAllJSFiles(fullPath));
		} else if (dirent.name.endsWith(".js")) {
			results.push(fullPath);
		}
	}
	return results;
}

// ===== 主流程 =====
const jsFiles = getAllJSFiles(SRC_DIR);
const updatedComments = [];
let processedCount = 0;
let errorCount = 0;

console.log(`找到 ${jsFiles.length} 个 JS 文件开始处理...\n`);

for (const filePath of jsFiles) {
	const relPath = path.relative(ROOT, filePath).replace(/\\/g, "/");
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const commentGroups = extractComments(content);
		if (commentGroups.length === 0) continue; // 无目标注释则跳过

		const hash = getFileHash(filePath);
		const stat = fs.statSync(filePath);
		const existing = existingMap[relPath];
		const lastModified = existing
			? existing.lastModified
			: stat.mtime.toISOString();

		updatedComments.push({
			path: relPath,
			category: existing?.category || "",
			name: existing?.name || "",
			description: existing?.description || "",
			srcVersion: existing?.srcVersion || "1.0",
			hash,
			lastModified,
			commentGroups: commentGroups.map((cg) => ({
				line: cg.line,
				comment: cg.comment,
			})),
		});

		console.log(`[${commentGroups.length} 个标签] ${relPath}`);
		processedCount++;
	} catch (e) {
		console.error(`读取失败: ${relPath} - ${e.message}`);
		errorCount++;
	}
}

const result = {
	version: "1.0",
	code: new Date().toISOString(),
	comments: updatedComments,
};

fs.writeFileSync(CACHE_PATH, JSON.stringify(result, null, "\t"), "utf-8");

console.log(`\n===== 注释锚点初始化完成 =====`);
console.log(`处理文件: ${processedCount} 个`);
console.log(`失败文件: ${errorCount} 个`);
console.log(
	`总计注释: ${updatedComments.reduce((sum, e) => sum + e.commentGroups.length, 0)} 条`,
);
console.log(`输出路径: ${CACHE_PATH}`);
