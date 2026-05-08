//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file scripts/build-skill-index.js - Skill 索引构建脚本，扫描 .cline/skills/ 下所有 .md 文件的 YAML 头部，生成 skills-index.json */
/* @skill-func
   parseYamlFrontMatter(content) : Object|null - 解析 Markdown 文件的 YAML front matter，支持多行列表格式（key 在上一行，列表在下一行）
   splitListItems(line, keyName) : Array|null - 尝试从 "key: - item1 - item2" 格式中拆分列表
   getCategory(relativePath) : string - 根据相对路径返回技能分类(code/sync/references/archive/cache/test/trash/other)
   buildTriggerGroups(triggers, descriptions) : Array - 构建触发词组对象数组，每组包含 triggers 和 description
   main() : Promise - 主函数，递归扫描 skills 目录，解析 YAML，生成 skills-index.json
   scanDir(dir) : void - 递归扫描目录，收集所有 .md 文件(排除 README.md)
*/
/* @skill-flow
   main → scanDir(收集.md文件) → 逐个解析YAML → 过滤无效条目 → 排序 → 写入skills-index.json
   parseYamlFrontMatter → 匹配---分隔符 → 分行解析key:value/列表格式 → 返回结构化对象
   buildTriggerGroups → 遍历triggers数组 → 配对descriptions → 返回{triggers,description}对象数组
*/
/* @skill-param
   content: string - Markdown 文件完整内容(含 YAML front matter)
   relativePath: string - 相对于 skills 目录的路径(用于分类和索引路径)
   line: string - 包含 "key: - item1 - item2" 格式的原始行
   keyName: string - 需要拆分的键名
   triggers: string[] - 触发词数组(每个元素可能是用|分隔的多触发词)
   descriptions: string[] - 对应的描述数组(可选)
   dir: string - 需要扫描的目录路径
*/
/* @skill-condition
   所属模块: build - 构建工具脚本
   依赖: Node.js fs 和 path 核心模块
   运行环境: 仅 Node.js(非浏览器)，通过 npm run build-skill-index 调用
   输出: .cline/skills/skills-index.json(索引缓存文件)
   扫描范围: .cline/skills/ 下所有 .md 文件(排除 README.md)
   YAML 规范: 仅支持简单 key:value 和 key 下缩进列表格式
   注意事项: 非源文件 YAML 要求 name 和 triggers 字段必填，否则跳过
   关联: .cline/skills/ 下的所有技能 .md 文件是数据源
*/
/**
 * Skill 索引构建脚本
 * 扫描 .cline/skills/ 下所有 .md 文件的 YAML 头部，生成 skills-index.json
 * 用法: node scripts/build-skill-index.js
 */
//  <!-- SYNC_COMMENTS_END -->

const fs = require("fs");
const path = require("path");

const SKILLS_DIR = path.join(__dirname, "..", ".cline", "skills");
const INDEX_FILE = path.join(SKILLS_DIR, "skills-index.json");

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
				// 先不设置，等下一行再看
				// 但先预先初始化空数组以便后面检查
				result[currentKey] = [];
				currentIsList = true; // 猜测是列表格式
			} else if (value.startsWith("-")) {
				// 单行列表项: "key: - item"
				const items = splitListItems(line, keyMatch[1]);
				if (items) {
					result[currentKey] = items;
					currentIsList = true;
				} else {
					result[currentKey] = value.replace(/^-\s*/, "").trim();
				}
			} else {
				// 普通标量值
				result[currentKey] = value;
				currentIsList = false;
			}
		} else if (currentKey) {
			// 列表项的延续行
			const itemMatch = trimmed.match(/^-\s*(.*)/);
			if (itemMatch) {
				if (!Array.isArray(result[currentKey])) {
					result[currentKey] = [];
				}
				result[currentKey].push(itemMatch[1].trim());
				currentIsList = true;
			} else if (currentIsList && Array.isArray(result[currentKey])) {
				// 列表结束了（遇到了非列表行），停止
				currentIsList = false;
				currentKey = null;
			}
		}
	}

	// 清理：如果列表是空的且没有实际项，删除它
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
	// 使用正则匹配所有 - item 片段
	const regex = /-\s*([^-]+)/g;
	let m;
	while ((m = regex.exec(rest)) !== null) {
		items.push(m[1].trim());
	}
	return items.length > 0 ? items : null;
}

function getCategory(relativePath) {
	if (relativePath.startsWith("code/")) return "code";
	if (relativePath.startsWith("sync/")) return "sync";
	if (relativePath.startsWith("references/")) return "references";
	if (relativePath.startsWith("archive/")) return "archive";
	if (relativePath.startsWith("cache/")) return "cache";
	if (relativePath.startsWith("test/")) return "test";
	if (relativePath.startsWith("trash/")) return "trash";
	return "other";
}

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

async function main() {
	const files = [];

	// 递归扫描所有 .md 文件
	function scanDir(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				scanDir(fullPath);
			} else if (
				entry.isFile() &&
				entry.name.endsWith(".md") &&
				entry.name !== "README.md"
			) {
				files.push(fullPath);
			}
		}
	}

	scanDir(SKILLS_DIR);

	console.log(`找到 ${files.length} 个 Skill .md 文件`);

	const skills = [];
	const warnings = [];

	for (const filePath of files) {
		const content = fs.readFileSync(filePath, "utf-8");
		const yaml = parseYamlFrontMatter(content);
		const relativePath = path
			.relative(SKILLS_DIR, filePath)
			.replace(/\\/g, "/");
		const stat = fs.statSync(filePath);

		if (!yaml) {
			warnings.push(`⚠️  ${relativePath}: 无 YAML 头部，已跳过`);
			continue;
		}

		if (!yaml.name) {
			warnings.push(`⚠️  ${relativePath}: 缺少 name 字段，已跳过`);
			continue;
		}

		const triggers = yaml.triggers;
		const descriptions = yaml.descriptions;

		if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
			warnings.push(`⚠️  ${relativePath}: 缺少 triggers 字段，已跳过`);
			continue;
		}

		// descriptions 为可选字段
		const normalizedDescriptions = Array.isArray(descriptions)
			? descriptions
			: [];

		const category = getCategory(relativePath);

		skills.push({
			path: `.cline/skills/${relativePath}`,
			category,
			name: yaml.name,
			description: yaml.description || "",
			skillVersion: yaml["skill-version"] || "1.0",
			lastModified: stat.mtime.toISOString().replace(/\.\d{3}Z$/, "Z"),
			triggerGroups: buildTriggerGroups(triggers, normalizedDescriptions),
		});
	}

	// 按路径升序排序
	skills.sort((a, b) => a.path.localeCompare(b.path));

	const indexData = {
		version: "1.0",
		lastUpdated: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
		skills,
	};

	// 输出预览
	console.log("\n=== 扫描结果预览 ===");
	console.log(`有效技能数: ${skills.length}`);
	console.log(`警告数: ${warnings.length}`);
	console.log("");

	if (warnings.length > 0) {
		console.log("--- 警告 ---");
		warnings.forEach((w) => console.log(w));
		console.log("");
	}

	console.log("--- 技能列表 ---");
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

	// 写入文件
	const jsonStr = JSON.stringify(indexData, null, 2);
	fs.writeFileSync(INDEX_FILE, jsonStr, "utf-8");
	console.log(`\n✅ 索引已写入: ${INDEX_FILE}`);
	console.log(`   共 ${skills.length} 个技能条目`);
}

main().catch((err) => {
	console.error("❌ 错误:", err);
	process.exit(1);
});
