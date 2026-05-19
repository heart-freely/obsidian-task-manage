// src/__tests__/persist-storage.test.js
import {
	PersistenceManager,
	createInitialState,
	getFilterFingerprint,
} from "../src/storage/persist-storage";
import { CONFIG } from "../src/configs/plugin-configs";

// 模拟异步存储
class MockStorage {
	constructor() {
		this.store = {};
	}
	async getItem(key) {
		return this.store[key] || null;
	}
	async setItem(key, value) {
		this.store[key] = value;
	}
}

describe("PersistenceManager", () => {
	let storage, persistence, state, collapsedNodes;

	beforeEach(() => {
		storage = new MockStorage();
		persistence = new PersistenceManager(storage, "test");
		state = createInitialState();
		collapsedNodes = {};
	});

	test("save and load works correctly", async () => {
		await persistence.save(state, collapsedNodes);
		const newState = createInitialState();
		const newCollapsed = {};
		const success = await persistence.load(
			newState,
			newCollapsed,
			() => ({ start: new Date(2025, 0, 1), end: new Date(2025, 0, 7) }),
			jest.fn(),
		);
		expect(success).toBe(true);
		expect(newState.hideRepeatTasks).toBe(true);
	});

	test("load returns false if no data", async () => {
		const newState = createInitialState();
		const newCollapsed = {};
		const success = await persistence.load(
			newState,
			newCollapsed,
			() => ({}),
		);
		expect(success).toBe(false);
	});
});
