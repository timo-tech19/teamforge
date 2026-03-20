import { describe, expect, it } from "vitest";
import { rowToTask } from "#/hooks/use-realtime-tasks";

describe("rowToTask", () => {
	it("maps a full database row to a Task", () => {
		const row = {
			id: "abc-123",
			title: "Fix login bug",
			description: "Users cannot log in with OAuth",
			status: "in_progress",
			priority: "high",
			position: 2,
			due_date: "2026-04-01",
			assigned_to: "user-456",
			created_by: "user-789",
			created_at: "2026-03-20T09:00:00Z",
		};

		expect(rowToTask(row)).toEqual({
			id: "abc-123",
			title: "Fix login bug",
			description: "Users cannot log in with OAuth",
			status: "in_progress",
			priority: "high",
			position: 2,
			dueDate: "2026-04-01",
			assignedTo: "user-456",
			createdBy: "user-789",
			createdAt: "2026-03-20T09:00:00Z",
		});
	});

	it("handles null optional fields", () => {
		const row = {
			id: "abc-123",
			title: "Simple task",
			description: null,
			status: "backlog",
			priority: "medium",
			position: 0,
			due_date: null,
			assigned_to: null,
			created_by: null,
			created_at: "2026-03-20T09:00:00Z",
		};

		const task = rowToTask(row);
		expect(task.description).toBeNull();
		expect(task.dueDate).toBeNull();
		expect(task.assignedTo).toBeNull();
		expect(task.createdBy).toBeNull();
	});

	it("handles missing optional fields (undefined in payload)", () => {
		const row = {
			id: "abc-123",
			title: "Minimal task",
			status: "todo",
			priority: "low",
			position: 0,
			created_at: "2026-03-20T09:00:00Z",
		};

		const task = rowToTask(row);
		expect(task.description).toBeNull();
		expect(task.dueDate).toBeNull();
		expect(task.assignedTo).toBeNull();
		expect(task.createdBy).toBeNull();
	});
});
