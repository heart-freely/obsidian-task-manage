/**
 * 更新 skills.md（静默版，直接写入）
 * - 源码与文档映射表 (SYNC_MAP)
 * - 双向同步触发词列表 (SYNC_TRIGGERS)
 * - 配置文件表 (SYNC_CONFIG)
 * - 缓存文件表 (SYNC_CACHE)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const SKILLS_DIR = path.join(ROOT, ".cline", "skills");
const SKILLS_MD = path.join(SKILLS_DIR, "skills.md");
const SKILLS_INDEX = path.join(SKILLS_DIR, "skills-index.json");
const SYNC_CONFIG = path.join(SKILLS_DIR, "sync", "sync_config.json");

// 读取配置（autoUpdateIndex 仅用于索引缺失时的提示，这里不做自动调用）
let autoUpdateIndex = true;
if (fs.existsSync(SYNC_CONFIG)) {
	try {
		const config = JSON.parse(fs.readFileSync(SYNC_CONFIG, "utf-8"));
		autoUpdateIndex =
			config.autoUpdateIndex !== undefined
				? config.autoUpdateIndex
				: true;
	} catch (e) {}
}

// 加载索引
if (!fs.existsSync(SKILLS_INDEX)) {
	console.error("skills-index.json 不存在，请先运行“更新技能索引”。");
	process.exit(1);
}

const indexData = JSON.parse(fs.readFileSync(SKILLS_INDEX, "utf-8"));
const srcEntries = indexData.src || [];
const skillsEntries = indexData.skills || [];
const docsEntries = indexData.docs || [];

// 构建 docs 路径集合
const docsPathSet = new Set(docsEntries.map((d) => d.path));

// ---------- 1. 源码-文档映射表 ----------
let mapTable = "| src 源码路径 | docs 文档路径 |\n|:---|:---|\n";
for (const src of srcEntries) {
	const docPath = src.path.replace(/^src\//, "docs/").replace(/\.js$/, ".md");
	const docCell = docsPathSet.has(docPath) ? `\`${docPath}\`` : "";
	mapTable += `| \`${src.path}\` | ${docCell} |\n`;
}

// ---------- 2. 双向同步触发词列表 ----------
let triggerList = "";
const syncSkills = skillsEntries.filter(
	(s) => s.category && s.category.includes("sync"),
);
for (const skill of syncSkills) {
	if (!skill.triggerGroups || skill.triggerGroups.length === 0) continue;
	const fileName = path.basename(skill.path);
	triggerList += `## ${fileName}\n\n`;
	for (const group of skill.triggerGroups) {
		const triggers = group.triggers.replace(/\|/g, " 或 ");
		const descPart = group.description ? `（${group.description}）` : "";
		triggerList += `执行触发词操作：${triggers}${descPart}（${skill.path}）\n`;
	}
	triggerList += "\n";
}

// ---------- 3. 配置文件表 ----------
const configTable = `| 文件                    | 用途                                             | 维护方式     |
| ----------------------- | ------------------------------------------------ | ------------ |
| \`sync/sync_config.json\` | 同步行为的配置（仲裁规则、自动快照、索引更新等） | 人工手动编辑 |
| \`cache/sync_state.json\` | 上次同步状态的记录（commit hash、文件 mtime）    | AI 自动读写  |`;

// ---------- 4. 缓存文件表 ----------
const cacheTable = `| 文件                    | 用途                                                                       | 维护方式         |
| ----------------------- | -------------------------------------------------------------------------- | ---------------- |
| \`skills-index.json\`     | 所有技能的元数据（路径、名称、触发词、版本、修改时间）                     | AI 自动生成/更新 |
| \`snapshots/index.json\`  | 快照文件的索引（文件名、时间戳、主题、决策）                               | AI 自动维护      |
| \`cache/code_cache.json\` | 源码中锚点（\`@auto-anchor\`）的位置缓存,源码中 \`@auto-*\` 注释的解析结果缓存 | AI 自动读写      |`;

// ---------- 区块处理 ----------
const sections = [
	{
		start: "<!-- SYNC_MAP_START -->",
		end: "<!-- SYNC_MAP_END -->",
		title: "# 源码与文档映射表",
		content: mapTable,
	},
	{
		start: "<!-- SYNC_TRIGGERS_START -->",
		end: "<!-- SYNC_TRIGGERS_END -->",
		title: "# 双向同步技能触发词列表",
		content: triggerList,
	},
	{
		start: "<!-- SYNC_CONFIG_START -->",
		end: "<!-- SYNC_CONFIG_END -->",
		title: "# 配置文件表",
		content: configTable,
	},
	{
		start: "<!-- SYNC_CACHE_START -->",
		end: "<!-- SYNC_CACHE_END -->",
		title: "# 缓存文件表",
		content: cacheTable,
	},
];

// 读取或创建 skills.md
let mdContent = "";
if (fs.existsSync(SKILLS_MD)) {
	mdContent = fs.readFileSync(SKILLS_MD, "utf-8");
}

// 替换或追加每个区块
for (const sec of sections) {
	const startIdx = mdContent.indexOf(sec.start);
	const endIdx = mdContent.indexOf(sec.end);

	const block = `${sec.title}\n\n${sec.content}`;

	if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
		// 替换现有区块
		mdContent =
			mdContent.substring(0, startIdx + sec.start.length) +
			"\n\n" +
			block +
			"\n\n" +
			mdContent.substring(endIdx);
	} else {
		// 追加新区块
		mdContent += `\n${sec.start}\n\n${block}\n\n${sec.end}\n`;
	}
}

// 写入文件
fs.writeFileSync(SKILLS_MD, mdContent, "utf-8");
console.log("skills.md 已更新。");
