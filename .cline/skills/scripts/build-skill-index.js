/**
 * 构建 skills-index.json（全量收录版）
 * - src  : 所有 .js 文件（排除 __mocks__, __tests__）
 * - skills: 所有 .md 文件（排除 archive/cache/snapshots）
 * - docs  : 所有 .md 文件（排除 __tests__）
 * 即使 YAML 头部缺失或字段不全，也会生成条目，缺失字段留空。
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const SRC_DIR = path.join(ROOT, "src");
const SKILLS_DIR = path.join(ROOT, ".cline", "skills");
const DOCS_DIR = path.join(ROOT, "docs");
const INDEX_PATH = path.join(SKILLS_DIR, "skills-index.json");

function collectFiles(dir, extension, basePath = "", skipDirs = []) {
	const results = [];
	if (!fs.existsSync(dir)) return results;
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const fullPath = path.join(dir, entry.name);
		const relPath = path.posix.join(basePath, entry.name);
		if (entry.isDirectory()) {
			if (skipDirs.includes(entry.name)) continue;
			results.push(
				...collectFiles(fullPath, extension, relPath, skipDirs),
			);
		} else if (entry.name.endsWith(extension)) {
			results.push({ fullPath, relPath });
		}
	}
	return results;
}

function parseYamlHeader(yamlStr) {
	const data = {};
	const lines = yamlStr.split("\n");
	let currentKey = null;
	let listBuffer = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === "" || /^---+$/.test(trimmed)) continue;
		const kvMatch = trimmed.match(/^([^:]+):\s*(.*)/);
		if (kvMatch) {
			if (currentKey && listBuffer.length > 0) {
				data[currentKey] = listBuffer;
				listBuffer = [];
			}
			currentKey = kvMatch[1].trim();
			const value = kvMatch[2].trim();
			if (value === "") {
				/* 可能为列表 */
			} else {
				data[currentKey] = value;
				currentKey = null;
			}
		} else if (/^\s*-\s+/.test(trimmed)) {
			const item = trimmed.replace(/^\s*-\s+/, "").trim();
			if (currentKey) listBuffer.push(item);
		}
	}
	if (currentKey && listBuffer.length > 0) data[currentKey] = listBuffer;
	return data;
}

function extractYamlHeader(content) {
	const startMatch = content.match(/^---+\s*$/m);
	if (!startMatch) return null;
	const startIdx = startMatch.index + startMatch[0].length;
	const remaining = content.slice(startIdx);
	const endMatch = remaining.match(/^---+\s*$/m);
	if (!endMatch) return null;
	return parseYamlHeader(remaining.slice(0, endMatch.index).trim());
}

function getCategory(relPath, rootPrefix) {
	const withoutRoot = relPath.startsWith(rootPrefix)
		? relPath.slice(rootPrefix.length)
		: relPath;
	const parts = withoutRoot.split("/").filter(Boolean);
	return parts.length > 1 ? parts[0] : "";
}

function buildSrcEntries() {
	const files = collectFiles(SRC_DIR, ".js", "src", [
		"__mocks__",
		"__tests__",
	]);
	const entries = [];
	for (const { fullPath, relPath } of files) {
		try {
			const stat = fs.statSync(fullPath);
			entries.push({
				path: relPath,
				category: getCategory(relPath, "src/"),
				name: path.basename(relPath, ".js"),
				description: "",
				srcVersion: "1.0",
				lastModified: stat.mtime.toISOString(),
			});
		} catch (e) {}
	}
	return entries;
}

function buildMdEntries(fileList, type) {
	const entries = [];
	for (const { fullPath, relPath } of fileList) {
		try {
			const stat = fs.statSync(fullPath);
			const content = fs.readFileSync(fullPath, "utf-8");
			const data = extractYamlHeader(content);

			// 基础字段
			const category = getCategory(
				relPath,
				type === "skills" ? ".cline/skills/" : "docs/",
			);
			const name = (data && data.name) || "";
			const description = (data && data.description) || "";

			const baseEntry = {
				path: relPath,
				category,
				name,
				description,
				lastModified: stat.mtime.toISOString(),
			};

			if (type === "docs") {
				baseEntry.docVersion =
					(data && (data["doc-version"] || data["skill-version"])) ||
					"1.0";
			} else {
				baseEntry.skillVersion =
					(data && data["skill-version"]) || "1.0";
				// 触发词处理
				const triggers =
					data && Array.isArray(data.triggers) ? data.triggers : [];
				const descriptions =
					data && Array.isArray(data.descriptions)
						? data.descriptions
						: [];
				const triggerGroups = [];
				const len = Math.min(triggers.length, descriptions.length);
				for (let i = 0; i < len; i++) {
					if (triggers[i]) {
						triggerGroups.push({
							triggers: triggers[i],
							description: descriptions[i] || "",
						});
					}
				}
				baseEntry.triggerGroups = triggerGroups;
			}
			entries.push(baseEntry);
		} catch (e) {}
	}
	return entries;
}

// 生成索引
const srcEntries = buildSrcEntries();
const skillFiles = collectFiles(SKILLS_DIR, ".md", ".cline/skills", [
	"archive",
	"cache",
	"snapshots",
]);
const skillEntries = buildMdEntries(skillFiles, "skills");
const docFiles = collectFiles(DOCS_DIR, ".md", "docs", ["__tests__"]);
const docsEntries = buildMdEntries(docFiles, "docs");

srcEntries.sort((a, b) => a.path.localeCompare(b.path));
skillEntries.sort((a, b) => a.path.localeCompare(b.path));
docsEntries.sort((a, b) => a.path.localeCompare(b.path));

const index = {
	version: "1.0",
	lastUpdated: new Date().toISOString(),
	src: srcEntries,
	skills: skillEntries,
	docs: docsEntries,
};

fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
console.log("skills-index.json 已更新。");
