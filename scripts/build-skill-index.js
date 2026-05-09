//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file scripts/build-skill-index.js - Skill 索引构建脚本，扫描 .cline/skills/ 下所有 .md 文件的 YAML 头部生成 skills-index.json，同时扫描 src/ 下 .js 文件构建 src 索引 */
/* @skill-func
   parseYamlFrontMatter(content) : Object|null - 解析 Markdown 文件的 YAML front matter，支持多行列表格式（key 在上一行，列表在下一行）
   splitListItems(line, keyName) : Array|null - 尝试从 "key: - item1 - item2" 格式中拆分列表
   getSkillCategory(relativePath) : string - 根据相对路径返回技能分类(code/sync/references/other)
   getSrcCategory(relativePath) : string - 根据 src/ 下的子目录路径返回分类名称
   buildTriggerGroups(triggers, descriptions) : Array - 构建触发词组对象数组，每组包含 triggers 和 description
   extractNameFromContent(content, filePath) : string - 从 JS 文件内容提取名称(优先类名/函数名/文件名)
   extractDescriptionFromContent(content) : string - 从 JS 文件头部提取描述信息
   extractImports(content) : Array - 从 JS 文件提取所有 import 语句的模块路径
   extractExports(content) : Array - 从 JS 文件提取所有 export 的标识符名称
   compareWithExisting(newSrc, newSkills) : Object - 与现有索引对比，返回新增/更新/删除统计
   main() : Promise - 主函数，扫描 skills 和 src 目录，解析信息，提示确认后写入
   scanSkillsDir(dir) : void - 递归扫描 skills 目录，收集所有 .md 文件(排除 README.md)
   scanSrcDir(dir) : void - 递归扫描 src 目录，收集所有 .js 文件(排除 __mocks__/ 和 __tests__/)
*/
/* @skill-flow
   main → scanSkillsDir(收集.md文件) → 逐个解析YAML → 校验descriptions → 构建skills数组
   main → scanSrcDir(收集.js文件) → 逐个提取import/export → 构建src数组
   main → compareWithExisting → 展示对比预览 → 用户确认 → 写入skills-index.json
   parseYamlFrontMatter → 匹配---分隔符 → 分行解析key:value/列表格式 → 返回结构化对象
   buildTriggerGroups → 遍历triggers数组 → 配对descriptions → 返回{triggers,description}对象数组
*/
/* @skill-param
   content: string - Markdown 或 JS 文件完整内容
   relativePath: string - 相对于项目根或 skills 目录的路径
   filePath: string - 文件的完整路径
   line: string - 包含 "key: - item1 - item2" 格式的原始行
   keyName: string - 需要拆分的键名
   triggers: string[] - 触发词数组(每个元素可能是用|分隔的多触发词)
   descriptions: string[] - 对应的描述数组(可选)
   dir: string - 需要扫描的目录路径
   newSrc: Array - 新扫描生成的 src 条目数组
   newSkills: Array - 新扫描生成的 skills 条目数组
*/
/* @skill-condition
   所属模块: build - 构建工具脚本
   依赖: Node.js fs 和 path 核心模块，readline 模块(用户交互)
   运行环境: 仅 Node.js(非浏览器)，通过 npm run build-skill-index 调用
   输出: .cline/skills/skills-index.json(索引缓存文件)
   扫描范围: .cline/skills/ 下所有 .md 文件(排除 README.md)；src/ 下所有 .js 文件(排除 __mocks__/ 和 __tests__/)
   YAML 规范: 仅支持简单 key:value 和 key 下缩进列表格式
   注意事项: skill 文件要求 name、triggers、descriptions 字段必填；descriptions 必须与 triggers 长度相同，否则跳过
   关联: .cline/skills/ 和 src/ 下的文件是数据源
*/
/**
 * Skill 索引构建脚本
 * 扫描 .cline/skills/ 下所有 .md 文件 + src/ 下所有 .js 文件，生成 skills-index.json
 * 用法: node scripts/build-skill-index.js [--yes|-y]
 *   --yes, -y: 跳过确认步骤，直接写入
 */
//  <!-- SYNC_COMMENTS_END -->

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const PROJECT_ROOT = path.join(__dirname, "..");
const SKILLS_DIR = path.join(PROJECT_ROOT, ".cline", "skills");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const INDEX_FILE = path.join(SKILLS_DIR, "skills-index.json");

// 跳过确认的标志
let SKIP_CONFIRM = false;

/**
 * 解析 YAML front matter，支持多行列表格式（key 在上一行，列表在下一行）
 * 例如:
 *   triggers:
 *     - item1
 *     - item2
 */
function parseYamlFrontMatter(content) {
	const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
	if (!match) return null;

	const yamlText = match[1];
	const result = {};
	let currentKey = null;
	let currentIsList = false;

	const lines = yamlText.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		// 跳过空行
		if (trimmed === "") continue;

		// 检查是否为新 key: value 行
		const keyMatch = line.match(/^(\w+):\s*(.*)/);
		if (keyMatch) {
			// 上一轮收集的列表数据
			if (
				currentKey &&
				currentIsList &&
				Array.isArray(result[currentKey]) &&
				result[currentKey].length === 0
			) {
				delete result[currentKey];
			}

			currentKey = keyMatch[1];
			let value = keyMatch[2].trim();
			currentIsList = false;

			if (value === "") {
				// 值可能为空，也可能在下一行以列表形式出现
				result[currentKey] = [];
				currentIsList = true;
			} else if (value.startsWith("-")) {
				const items = splitListItems(line, keyMatch[1]);
				if (items) {
					result[currentKey] = items;
					currentIsList = true;
				} else {
					result[currentKey] = value.replace(/^-\s*/, "").trim();
				}
			} else {
				result[currentKey] = value;
				currentIsList = false;
			}
		} else if (currentKey) {
			const itemMatch = trimmed.match(/^-\s*(.*)/);
			if (itemMatch) {
				if (!Array.isArray(result[currentKey])) {
					result[currentKey] = [];
				}
				result[currentKey].push(itemMatch[1].trim());
				currentIsList = true;
			} else if (currentIsList && Array.isArray(result[currentKey])) {
				currentIsList = false;
				currentKey = null;
			}
		}
	}

	// 清理空的列表
	for (const key of Object.keys(result)) {
		if (Array.isArray(result[key]) && result[key].length === 0) {
			delete result[key];
		}
	}

	return result;
}

/**
 * 尝试从 "key: - item1 - item2" 格式中拆分列表
 */
function splitListItems(line, keyName) {
	const rest = line.slice(keyName.length + 1).trim();
	if (!rest.startsWith("-")) return null;

	const items = [];
	const regex = /-\s*([^-]+)/g;
	let m;
	while ((m = regex.exec(rest)) !== null) {
		items.push(m[1].trim());
	}
	return items.length > 0 ? items : null;
}

/**
 * 根据 skill 相对路径返回分类
 * 只支持 code、sync、references，其余为 other
 */
function getSkillCategory(relativePath) {
	if (relativePath.startsWith("code/")) return "code";
	if (relativePath.startsWith("sync/")) return "sync";
	if (relativePath.startsWith("references/")) return "references";
	return "other";
}

/**
 * 根据 src/ 下子目录路径返回分类名称
 */
function getSrcCategory(relativePath) {
	const dirs = relativePath.replace(/\\/g, "/").split("/");
	// src/xxx/... → 取 src 后的第一个目录
	if (dirs.length >= 2) {
		return dirs[1]; // 例如 panel, tasks, configs, utils, echarts, storages
	}
	return "other";
}

/**
 * 构建 triggerGroups 数组
 */
function buildTriggerGroups(triggers, descriptions) {
	if (!Array.isArray(triggers) || triggers.length === 0) return [];

	const groups = [];
	for (let i = 0; i < triggers.length; i++) {
		groups.push({
			triggers: triggers[i],
			description:
				descriptions && i < descriptions.length ? descriptions[i] : "",
		});
	}
	return groups;
}

/**
 * 从 JS 文件内容中提取名称
 * 优先提取类名，然后是函数名，最后回退到文件名
 */
function extractNameFromContent(content, filePath) {
	// 尝试匹配 class Xxx extends ... 或 class Xxx
	const classMatch = content.match(
		/^(?:export\s+)?(?:default\s+)?class\s+(\w+)/m,
	);
	if (classMatch) return classMatch[1];

	// 尝试匹配 function Xxx
	const funcMatch = content.match(
		/^(?:export\s+)?(?:default\s+)?function\s+(\w+)/m,
	);
	if (funcMatch) return funcMatch[1];

	// 尝试匹配 const Xxx = (...) => 或 const Xxx = function
	const constFuncMatch = content.match(
		/^(?:export\s+)?(?:default\s+)?const\s+(\w+)\s*=\s*(?:\(|function)/m,
	);
	if (constFuncMatch) return constFuncMatch[1];

	// 回退：从文件路径提取文件名（去掉 .js 后缀和路径）
	const basename = path.basename(filePath, ".js");
	// 将 kebab-case 转换为 Pascal Case 可读形式
	return basename
		.split(/-/g)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * 从 JS 文件头部注释提取描述信息
 */
function extractDescriptionFromContent(content) {
	// 尝试匹配文件头部 JSDoc 注释中的 @description
	const descMatch = content.match(/@description\s+(.+)/);
	if (descMatch) return descMatch[1].trim();

	// 尝试匹配 @skill-sig 注释中的描述部分
	const sigMatch = content.match(/@skill-sig\s+.+-\s*(.+)/);
	if (sigMatch) return sigMatch[1].trim();

	// 尝试匹配第一行块注释中的内容
	const blockComment = content.match(/\/\*\*?\s*\n\s*\*\s*(.+)/);
	if (blockComment) return blockComment[1].trim();

	return "";
}

/**
 * 从 JS 文件提取所有 import 语句的模块路径或模块名
 */
function extractImports(content) {
	const imports = [];
	const importRegex =
		/import\s+(?:(?:\{[^}]*\})|(?:[\w*\s,]*))\s+from\s+['"]([^'"]+)['"]/g;
	let match;
	while ((match = importRegex.exec(content)) !== null) {
		imports.push(match[1]);
	}
	return imports;
}

/**
 * 从 JS 文件提取所有 export 的标识符名称
 */
function extractExports(content) {
	const exports = [];
	const patterns = [
		/export\s+class\s+(\w+)/g,
		/export\s+function\s+(\w+)/g,
		/export\s+const\s+(\w+)/g,
		/export\s+let\s+(\w+)/g,
		/export\s+var\s+(\w+)/g,
		/export\s+default\s+(?:class|function)\s+(\w+)/g,
		/export\s+\{[^}]*\b(\w+)\b[^}]*\}/g,
	];

	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			const name = match[1].trim();
			if (name && !exports.includes(name)) {
				exports.push(name);
			}
		}
	}

	return exports;
}

/**
 * 与现有索引对比，返回统计信息
 */
function compareWithExisting(newSrc, newSkills) {
	let existing = { src: [], skills: [] };
	try {
		if (fs.existsSync(INDEX_FILE)) {
			existing = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
			if (!existing.src) existing.src = [];
			if (!existing.skills) existing.skills = [];
		}
	} catch {
		// 现有索引损坏或不存在，当作全新
	}

	const newSrcPaths = new Set(newSrc.map((s) => s.path));
	const oldSrcPaths = new Set(existing.src.map((s) => s.path));
	const newSkillPaths = new Set(newSkills.map((s) => s.path));
	const oldSkillPaths = new Set(existing.skills.map((s) => s.path));

	const srcAdded = newSrc.filter((s) => !oldSrcPaths.has(s.path)).length;
	const srcRemoved = existing.src.filter(
		(s) => !newSrcPaths.has(s.path),
	).length;
	const srcUpdated = newSrc.filter((s) => {
		const old = existing.src.find((o) => o.path === s.path);
		if (!old) return false;
		return (
			old.lastModified !== s.lastModified ||
			JSON.stringify(old.imports) !== JSON.stringify(s.imports) ||
			JSON.stringify(old.exports) !== JSON.stringify(s.exports)
		);
	}).length;

	const skillAdded = newSkills.filter(
		(s) => !oldSkillPaths.has(s.path),
	).length;
	const skillRemoved = existing.skills.filter(
		(s) => !newSkillPaths.has(s.path),
	).length;
	const skillUpdated = newSkills.filter((s) => {
		const old = existing.skills.find((o) => o.path === s.path);
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

/**
 * 询问用户确认
 */
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

async function main() {
	// 检查命令行参数
	if (process.argv.includes("--yes") || process.argv.includes("-y")) {
		SKIP_CONFIRM = true;
	}

	// =========================================================================
	// 1. 扫描 skills 目录
	// =========================================================================
	const skillFiles = [];

	function scanSkillsDir(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				scanSkillsDir(fullPath);
			} else if (
				entry.isFile() &&
				entry.name.endsWith(".md") &&
				entry.name !== "README.md"
			) {
				skillFiles.push(fullPath);
			}
		}
	}

	scanSkillsDir(SKILLS_DIR);
	console.log(`找到 ${skillFiles.length} 个 Skill .md 文件`);

	// =========================================================================
	// 2. 扫描 src 目录
	// =========================================================================
	const srcFiles = [];

	function scanSrcDir(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				// 跳过 __mocks__ 和 __tests__ 目录
				if (entry.name === "__mocks__" || entry.name === "__tests__") {
					continue;
				}
				scanSrcDir(fullPath);
			} else if (entry.isFile() && entry.name.endsWith(".js")) {
				srcFiles.push(fullPath);
			}
		}
	}

	if (fs.existsSync(SRC_DIR)) {
		scanSrcDir(SRC_DIR);
	}
	console.log(`找到 ${srcFiles.length} 个 src .js 文件`);

	// =========================================================================
	// 3. 解析 skills 索引条目
	// =========================================================================
	const skills = [];
	const skillWarnings = [];

	for (const filePath of skillFiles) {
		const content = fs.readFileSync(filePath, "utf-8");
		const yaml = parseYamlFrontMatter(content);
		const relativePath = path
			.relative(SKILLS_DIR, filePath)
			.replace(/\\/g, "/");
		const stat = fs.statSync(filePath);

		if (!yaml) {
			skillWarnings.push(`⚠️  ${relativePath}: 无 YAML 头部，已跳过`);
			continue;
		}

		if (!yaml.name) {
			skillWarnings.push(`⚠️  ${relativePath}: 缺少 name 字段，已跳过`);
			continue;
		}

		const triggers = yaml.triggers;
		const descriptions = yaml.descriptions;

		// triggers 必须存在且为非空数组
		if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
			skillWarnings.push(
				`⚠️  ${relativePath}: 缺少 triggers 字段，已跳过`,
			);
			continue;
		}

		// descriptions 必须存在、为数组、且长度与 triggers 相同
		if (
			!descriptions ||
			!Array.isArray(descriptions) ||
			descriptions.length !== triggers.length
		) {
			skillWarnings.push(
				`⚠️  ${relativePath}: descriptions 字段缺失或长度(${
					Array.isArray(descriptions) ? descriptions.length : 0
				})与 triggers(${triggers.length})不匹配，已跳过`,
			);
			continue;
		}

		const category = getSkillCategory(relativePath);

		skills.push({
			path: `.cline/skills/${relativePath}`,
			category,
			name: yaml.name,
			description: yaml.description || "",
			skillVersion: yaml["skill-version"] || "1.0",
			lastModified: stat.mtime.toISOString().replace(/\.\d{3}Z$/, "Z"),
			triggerGroups: buildTriggerGroups(triggers, descriptions),
		});
	}

	// 按路径升序排序
	skills.sort((a, b) => a.path.localeCompare(b.path));

	// =========================================================================
	// 4. 解析 src 索引条目
	// =========================================================================
	const srcEntries = [];
	const srcWarnings = [];

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
			dependGroups: [],
		});
	}

	// 按路径升序排序
	srcEntries.sort((a, b) => a.path.localeCompare(b.path));

	// =========================================================================
	// 5. 对比统计
	// =========================================================================
	const stats = compareWithExisting(srcEntries, skills);

	// =========================================================================
	// 6. 输出预览
	// =========================================================================
	console.log("\n=== 扫描结果预览 ===");
	console.log("");
	console.log("--- 统计 ---");
	console.log(`源文件(src): ${srcEntries.length} 个`);
	console.log(
		`  新增: ${stats.src.added}, 更新: ${stats.src.updated}, 删除: ${stats.src.removed}`,
	);
	console.log(`技能(skills): ${skills.length} 个`);
	console.log(
		`  新增: ${stats.skills.added}, 更新: ${stats.skills.updated}, 删除: ${stats.skills.removed}`,
	);
	console.log("");

	if (skillWarnings.length > 0) {
		console.log("--- Skill 警告 ---");
		skillWarnings.forEach((w) => console.log(w));
		console.log("");
	}

	if (srcWarnings.length > 0) {
		console.log("--- Src 警告 ---");
		srcWarnings.forEach((w) => console.log(w));
		console.log("");
	}

	console.log("--- 源文件(src)列表 ---");
	srcEntries.forEach((s) => {
		const exportsStr =
			s.exports.length > 0 ? s.exports.join(", ") : "(无导出)";
		console.log(`  [${s.category}] ${s.name}`);
		console.log(`    路径: ${s.path}`);
		console.log(`    导出: ${exportsStr}`);
	});

	console.log("");
	console.log("--- 技能(skills)列表 ---");
	skills.forEach((s) => {
		const triggersStr = s.triggerGroups
			.map((tg) =>
				tg.triggers
					.split("|")
					.map((t) => t.trim())
					.join(", "),
			)
			.join("; ");
		console.log(`  [${s.category}] ${s.name} (${s.path})`);
		console.log(`    触发词: ${triggersStr}`);
		console.log(`    版本: ${s.skillVersion}`);
	});

	// =========================================================================
	// 7. 用户确认
	// =========================================================================
	console.log("");
	const confirmed = await askConfirm("是否写入索引文件? (y/N): ");

	if (!confirmed) {
		console.log("❌ 已取消写入");
		return;
	}

	// =========================================================================
	// 8. 写入文件
	// =========================================================================
	const indexData = {
		version: "1.0",
		lastUpdated: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
		src: srcEntries,
		skills,
	};

	const jsonStr = JSON.stringify(indexData, null, 2);
	fs.writeFileSync(INDEX_FILE, jsonStr, "utf-8");
	console.log(`\n✅ 索引已写入: ${INDEX_FILE}`);
	console.log(`   src 条目: ${srcEntries.length} 个`);
	console.log(`   skills 条目: ${skills.length} 个`);
}

main().catch((err) => {
	console.error("❌ 错误:", err);
	process.exit(1);
});
