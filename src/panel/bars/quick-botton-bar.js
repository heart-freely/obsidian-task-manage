const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_INDEX_PATH = path.join(ROOT, ".cline/skills/skills-index.json");
const CACHE_PATH = path.join(ROOT, ".cline/skills/cache/code_cache.json");

const indexData = JSON.parse(fs.readFileSync(SKILLS_INDEX_PATH, "utf-8"));
const srcEntries = indexData.src;

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
	console.warn("无法读取现有缓存，将创建新缓存");
}

const existingMap = {};
for (const entry of existingCache.comments) {
	existingMap[entry.path] = entry;
}

function extractComments(content) {
	const lines = content.split("\n");
	const result = [];
	let inBlockComment = false;
	let blockCommentLines = [];
	let blockStartLine = -1;

	/**
	 * 判断是否是真实的行注释（排除 URL、正则中的 //）
	 */
	function isLineComment(line, idx) {
		if (idx === 0) return true;
		const ch = line[idx - 1];
		return " \t;,()[]{} +-*%&|!~=<>?:.".includes(ch);
	}

	/**
	 * 将收集到的多行块注释按 @auto-* / @auto-anchor 拆分
	 */
	function processBlockComment(blockLines, startLine) {
		const skillRegex = /@auto-(?!anchor\b)|@auto-anchor/;
		const matchIndices = [];

		for (let i = 0; i < blockLines.length; i++) {
			if (skillRegex.test(blockLines[i])) {
				matchIndices.push(i);
			}
		}

		if (matchIndices.length === 0) return;

		for (let m = 0; m < matchIndices.length; m++) {
			const startIdx = matchIndices[m];

			const endIdx =
				m + 1 < matchIndices.length
					? matchIndices[m + 1] - 1
					: blockLines.length - 1;

			const segmentLines = blockLines.slice(startIdx, endIdx + 1);
			result.push({
				line: startLine + startIdx, // 1-based 行号
				comment: segmentLines.join("\n"), // 保留原始格式
			});
		}
	}

	for (let i = 0; i < lines.length; i++) {
		const lineNum = i + 1;
		const line = lines[i];

		if (inBlockComment) {
			blockCommentLines.push(line);
			if (line.includes("*/")) {
				inBlockComment = false;
				processBlockComment(blockCommentLines, blockStartLine);
				blockCommentLines = [];
				blockStartLine = -1;
			}
			continue;
		}

		const singleIdx = line.indexOf("//");
		if (singleIdx !== -1 && isLineComment(line, singleIdx)) {
			const commentPart = line.slice(singleIdx);
			if (/@auto-(?!anchor\b)|@auto-anchor/.test(commentPart)) {
				result.push({ line: lineNum, comment: commentPart });
			}
			continue;
		}

		if (line.includes("/*")) {
			inBlockComment = true;
			blockCommentLines = [line];
			blockStartLine = lineNum;

			if (line.includes("*/")) {
				inBlockComment = false;
				processBlockComment(blockCommentLines, blockStartLine);
				blockCommentLines = [];
				blockStartLine = -1;
			}
		}
	}

	return result;
}

/**
 * 获取文件的简易哈希（用于检测变更）
 */
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

const updatedComments = [];
let processedCount = 0;
let errorCount = 0;

for (const entry of srcEntries) {
	const filePath = path.join(ROOT, entry.path);

	if (!fs.existsSync(filePath)) {
		console.warn(`文件不存在: ${entry.path}`);
		errorCount++;
		continue;
	}

	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const commentGroups = extractComments(content);
		const hash = getFileHash(filePath);
		const stat = fs.statSync(filePath);

		const existing = existingMap[entry.path];
		const lastModified = existing
			? existing.lastModified
			: stat.mtime.toISOString();

		updatedComments.push({
			path: entry.path,
			category: entry.category || "",
			name: entry.name || "",
			description: entry.description || "",
			srcVersion: entry.srcVersion || "1.0",
			hash: hash,
			lastModified: lastModified,
			commentGroups: commentGroups.map((cg) => ({
				line: cg.line,
				comment: cg.comment,
			})),
		});

		processedCount++;
		if (commentGroups.length > 0) {
			console.log(`  [${commentGroups.length} 个注释] ${entry.path}`);
		}
	} catch (e) {
		console.error(`读取失败: ${entry.path} - ${e.message}`);
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
console.log(`  处理文件: ${processedCount} 个`);
console.log(`  失败文件: ${errorCount} 个`);
console.log(
	`  总计注释: ${updatedComments.reduce((sum, e) => sum + e.commentGroups.length, 0)} 条`,
);
console.log(`  输出路径: ${CACHE_PATH}`);
