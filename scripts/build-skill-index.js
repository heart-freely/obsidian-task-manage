const fs = require("fs");
const path = require("path");
const readline = require("readline");

const PROJECT_ROOT = path.join(__dirname, "..");
const SKILLS_DIR = path.join(PROJECT_ROOT, ".cline", "skills");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const INDEX_FILE = path.join(SKILLS_DIR, "skills-index.json");

let SKIP_CONFIRM = false;

function parseYamlFrontMatter(content) {
	const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
	if (!match) return null;

	const yamlText = match[1];
	const result = {};
	let currentKey = null;
	let currentList = [];

	const lines = yamlText.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		if (trimmed === "") continue;

		const keyMatch = line.match(/^(\w+):\s*(.*)/);
		if (keyMatch) {
			if (currentKey && currentList.length > 0) {
				result[currentKey] = currentList;
				currentList = [];
			}
			currentKey = keyMatch[1];
			const value = keyMatch[2].trim();
			if (value === "") {
				currentList = [];
			} else if (value.startsWith("-")) {
				const items = value.split(/\s*-\s*/).filter(Boolean);
				result[currentKey] = items;
				currentKey = null;
			} else {
				result[currentKey] = value;
				currentKey = null;
			}
		} else if (currentKey && /^\s*-/.test(line)) {
			const item = line.replace(/^\s*-\s*/, "").trim();
			if (item) currentList.push(item);
		} else {
			if (currentKey && currentList.length > 0) {
				result[currentKey] = currentList;
				currentList = [];
			}
			currentKey = null;
		}
	}
	if (currentKey && currentList.length > 0) {
		result[currentKey] = currentList;
	}
	return result;
}

function buildTriggerGroups(triggers, descriptions = []) {
	if (!Array.isArray(triggers) || triggers.length === 0) return [];
	return triggers.map((trigger, idx) => ({
		triggers: trigger,
		description: descriptions[idx] || "",
	}));
}

function extractNameFromContent(content, filePath) {
	const classMatch = content.match(
		/^(?:export\s+)?(?:default\s+)?class\s+(\w+)/m,
	);
	if (classMatch) return classMatch[1];
	const funcMatch = content.match(
		/^(?:export\s+)?(?:default\s+)?function\s+(\w+)/m,
	);
	if (funcMatch) return funcMatch[1];
	const constFuncMatch = content.match(
		/^(?:export\s+)?(?:default\s+)?const\s+(\w+)\s*=\s*(?:\(|function)/m,
	);
	if (constFuncMatch) return constFuncMatch[1];
	const basename = path.basename(filePath, ".js");
	return basename
		.split(/-/g)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function extractDescriptionFromContent(content) {
	const descMatch = content.match(/@description\s+(.+)/);
	if (descMatch) return descMatch[1].trim();
	const sigMatch = content.match(/@skill-sig\s+.+-\s*(.+)/);
	if (sigMatch) return sigMatch[1].trim();
	const blockComment = content.match(/\/\*\*?\s*\n\s*\*\s*(.+)/);
	if (blockComment) return blockComment[1].trim();
	return "";
}

function extractImports(content) {
	const imports = [];
	const regex =
		/import\s+(?:(?:\{[^}]*\})|(?:[\w*\s,]*))\s+from\s+['"]([^'"]+)['"]/g;
	let match;
	while ((match = regex.exec(content)) !== null) {
		imports.push(match[1]);
	}
	return imports;
}

function extractExports(content) {
	const exportsSet = new Set();
	const patterns = [
		/export\s+class\s+(\w+)/g,
		/export\s+function\s+(\w+)/g,
		/export\s+const\s+(\w+)/g,
		/export\s+let\s+(\w+)/g,
		/export\s+var\s+(\w+)/g,
		/export\s+default\s+(?:class|function)\s+(\w+)/g,
		/export\s+\{([^}]+)\}/g,
	];
	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			if (match[1]) {
				const exportsPart = match[1];
				if (exportsPart.includes(",")) {
					exportsPart.split(",").forEach((part) => {
						const name = part
							.trim()
							.split(/\s+as\s+/)
							.pop();
						if (name) exportsSet.add(name);
					});
				} else {
					const name = exportsPart
						.trim()
						.split(/\s+as\s+/)
						.pop();
					if (name) exportsSet.add(name);
				}
			}
		}
	}
	return Array.from(exportsSet);
}

function getSkillCategory(relativePath) {
	if (relativePath.startsWith("code/")) return "code";
	if (relativePath.startsWith("sync/")) return "sync";
	if (relativePath.startsWith("references/")) return "references";
	return "other";
}

function getSrcCategory(relativePath) {
	const parts = relativePath.replace(/\\/g, "/").split("/");
	return parts.length >= 2 ? parts[1] : "other";
}

function compareWithExisting(newSrc, newSkills) {
	let existing = { src: [], skills: [] };
	try {
		if (fs.existsSync(INDEX_FILE)) {
			existing = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
			if (!existing.src) existing.src = [];
			if (!existing.skills) existing.skills = [];
		}
	} catch {
		// ignore
	}
	const newSrcMap = new Map(newSrc.map((s) => [s.path, s]));
	const oldSrcMap = new Map(existing.src.map((s) => [s.path, s]));
	const newSkillMap = new Map(newSkills.map((s) => [s.path, s]));
	const oldSkillMap = new Map(existing.skills.map((s) => [s.path, s]));

	const srcAdded = newSrc.filter((s) => !oldSrcMap.has(s.path)).length;
	const srcRemoved = existing.src.filter(
		(s) => !newSrcMap.has(s.path),
	).length;
	const srcUpdated = newSrc.filter((s) => {
		const old = oldSrcMap.get(s.path);
		if (!old) return false;
		return (
			old.lastModified !== s.lastModified ||
			JSON.stringify(old.imports) !== JSON.stringify(s.imports) ||
			JSON.stringify(old.exports) !== JSON.stringify(s.exports)
		);
	}).length;

	const skillAdded = newSkills.filter((s) => !oldSkillMap.has(s.path)).length;
	const skillRemoved = existing.skills.filter(
		(s) => !newSkillMap.has(s.path),
	).length;
	const skillUpdated = newSkills.filter((s) => {
		const old = oldSkillMap.get(s.path);
		if (!old) return false;
		return (
			old.lastModified !== s.lastModified ||
			JSON.stringify(old.triggerGroups) !==
				JSON.stringify(s.triggerGroups)
		);
	}).length;

	return {
		src: { added: srcAdded, updated: srcUpdated, removed: srcRemoved },
		skills: {
			added: skillAdded,
			updated: skillUpdated,
			removed: skillRemoved,
		},
	};
}

function askConfirm(question) {
	return new Promise((resolve) => {
		if (SKIP_CONFIRM) {
			resolve(true);
			return;
		}
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.question(question, (answer) => {
			rl.close();
			resolve(
				answer.toLowerCase() === "y" || answer.toLowerCase() === "yes",
			);
		});
	});
}

function scanSkillsDir(dir, fileList) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			scanSkillsDir(fullPath, fileList);
		} else if (
			entry.isFile() &&
			entry.name.endsWith(".md") &&
			entry.name !== "README.md"
		) {
			fileList.push(fullPath);
		}
	}
}

function scanSrcDir(dir, fileList) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "__mocks__" || entry.name === "__tests__")
				continue;
			scanSrcDir(fullPath, fileList);
		} else if (entry.isFile() && entry.name.endsWith(".js")) {
			fileList.push(fullPath);
		}
	}
}

function processSkillFiles(skillFiles) {
	const skills = [];
	for (const filePath of skillFiles) {
		const content = fs.readFileSync(filePath, "utf-8");
		const yaml = parseYamlFrontMatter(content);
		const relativePath = path
			.relative(SKILLS_DIR, filePath)
			.replace(/\\/g, "/");
		const stat = fs.statSync(filePath);
		const entry = {
			path: `.cline/skills/${relativePath}`,
			category: getSkillCategory(relativePath),
			name: "",
			description: "",
			skillVersion: "1.0",
			lastModified: stat.mtime.toISOString().replace(/\.\d{3}Z$/, "Z"),
			triggerGroups: [],
		};
		if (yaml) {
			entry.name = yaml.name || "";
			entry.description = yaml.description || "";
			entry.skillVersion = yaml["skill-version"] || "1.0";
			const triggers = yaml.triggers;
			const descriptions = yaml.descriptions;
			entry.triggerGroups = buildTriggerGroups(
				triggers || [],
				descriptions || [],
			);
		}
		skills.push(entry);
	}
	return skills;
}

function processSrcFiles(srcFiles) {
	const srcEntries = [];
	for (const filePath of srcFiles) {
		const content = fs.readFileSync(filePath, "utf-8");
		const relativePath = path
			.relative(PROJECT_ROOT, filePath)
			.replace(/\\/g, "/");
		const stat = fs.statSync(filePath);
		const name = extractNameFromContent(content, filePath);
		const description = extractDescriptionFromContent(content);
		const imports = extractImports(content);
		const exports = extractExports(content);
		const category = getSrcCategory(relativePath);
		srcEntries.push({
			path: relativePath,
			category,
			name,
			description,
			srcVersion: "1.0",
			lastModified: stat.mtime.toISOString().replace(/\.\d{3}Z$/, "Z"),
			imports,
			exports,
		});
	}
	return srcEntries;
}

async function main() {
	if (process.argv.includes("--yes") || process.argv.includes("-y")) {
		SKIP_CONFIRM = true;
	}

	const skillFiles = [];
	if (fs.existsSync(SKILLS_DIR)) {
		scanSkillsDir(SKILLS_DIR, skillFiles);
	}

	const srcFiles = [];
	if (fs.existsSync(SRC_DIR)) {
		scanSrcDir(SRC_DIR, srcFiles);
	}

	const skills = processSkillFiles(skillFiles);
	const srcEntries = processSrcFiles(srcFiles);

	skills.sort((a, b) => a.path.localeCompare(b.path));
	srcEntries.sort((a, b) => a.path.localeCompare(b.path));

	const stats = compareWithExisting(srcEntries, skills);
	const totalChanges =
		stats.src.added +
		stats.src.updated +
		stats.src.removed +
		stats.skills.added +
		stats.skills.updated +
		stats.skills.removed;
	if (totalChanges === 0) {
		// 无变化，直接退出（不询问）
		return;
	}

	const confirmed = await askConfirm("是否写入索引文件? (y/N): ");
	if (!confirmed) return;

	const indexData = {
		version: "1.0",
		lastUpdated: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
		src: srcEntries,
		skills,
	};
	fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2), "utf-8");
}

main().catch((err) => {
	console.error("❌ 错误:", err);
	process.exit(1);
});
