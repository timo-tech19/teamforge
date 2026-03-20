import { describe, expect, it } from "vitest";
import { listActivitySchema } from "#/lib/activity/functions";
import { loginSchema, signupSchema } from "#/lib/auth/functions";
import { createCommentSchema } from "#/lib/comment/functions";
import { inviteMemberSchema } from "#/lib/member/functions";
import { addProjectMemberSchema } from "#/lib/project-member/functions";
import { createProjectSchema } from "#/lib/project/functions";
import { createTaskSchema } from "#/lib/task/functions";
import { createWorkspaceSchema } from "#/lib/workspace/functions";

describe("loginSchema", () => {
	it("accepts valid credentials", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "secret123",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid email", () => {
		const result = loginSchema.safeParse({
			email: "not-an-email",
			password: "secret123",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty password", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing fields", () => {
		expect(loginSchema.safeParse({}).success).toBe(false);
		expect(loginSchema.safeParse({ email: "user@example.com" }).success).toBe(
			false,
		);
	});
});

describe("signupSchema", () => {
	it("accepts valid input", () => {
		const result = signupSchema.safeParse({
			displayName: "Timo",
			email: "timo@example.com",
			password: "secure123",
		});
		expect(result.success).toBe(true);
	});

	it("rejects display name under 2 characters", () => {
		const result = signupSchema.safeParse({
			displayName: "T",
			email: "timo@example.com",
			password: "secure123",
		});
		expect(result.success).toBe(false);
	});

	it("rejects display name over 50 characters", () => {
		const result = signupSchema.safeParse({
			displayName: "A".repeat(51),
			email: "timo@example.com",
			password: "secure123",
		});
		expect(result.success).toBe(false);
	});

	it("rejects password under 6 characters", () => {
		const result = signupSchema.safeParse({
			displayName: "Timo",
			email: "timo@example.com",
			password: "12345",
		});
		expect(result.success).toBe(false);
	});

	it("rejects password over 72 characters", () => {
		const result = signupSchema.safeParse({
			displayName: "Timo",
			email: "timo@example.com",
			password: "a".repeat(73),
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid email", () => {
		const result = signupSchema.safeParse({
			displayName: "Timo",
			email: "bad-email",
			password: "secure123",
		});
		expect(result.success).toBe(false);
	});
});

describe("createWorkspaceSchema", () => {
	it("accepts valid workspace input", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme Corp",
			slug: "acme-corp",
		});
		expect(result.success).toBe(true);
	});

	it("accepts slug with numbers", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Team 42",
			slug: "team-42",
		});
		expect(result.success).toBe(true);
	});

	it("accepts single-word slug", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "acme",
		});
		expect(result.success).toBe(true);
	});

	it("rejects name under 2 characters", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "A",
			slug: "acme",
		});
		expect(result.success).toBe(false);
	});

	it("rejects name over 50 characters", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "A".repeat(51),
			slug: "acme",
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug under 2 characters", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "a",
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug over 40 characters", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "a".repeat(41),
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug with uppercase letters", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "Acme-Corp",
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug with spaces", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "acme corp",
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug starting with a hyphen", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "-acme",
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug ending with a hyphen", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "acme-",
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug with consecutive hyphens", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "acme--corp",
		});
		expect(result.success).toBe(false);
	});

	it("rejects slug with special characters", () => {
		const result = createWorkspaceSchema.safeParse({
			name: "Acme",
			slug: "acme_corp",
		});
		expect(result.success).toBe(false);
	});
});

describe("createProjectSchema", () => {
	const validUuid = "550e8400-e29b-41d4-a716-446655440000";

	it("accepts valid project input", () => {
		const result = createProjectSchema.safeParse({
			workspaceId: validUuid,
			name: "Website Redesign",
		});
		expect(result.success).toBe(true);
	});

	it("accepts project with description", () => {
		const result = createProjectSchema.safeParse({
			workspaceId: validUuid,
			name: "Website Redesign",
			description: "Revamp the marketing site",
		});
		expect(result.success).toBe(true);
	});

	it("accepts project without description", () => {
		const result = createProjectSchema.safeParse({
			workspaceId: validUuid,
			name: "Website Redesign",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.description).toBeUndefined();
		}
	});

	it("rejects name under 2 characters", () => {
		const result = createProjectSchema.safeParse({
			workspaceId: validUuid,
			name: "A",
		});
		expect(result.success).toBe(false);
	});

	it("rejects name over 100 characters", () => {
		const result = createProjectSchema.safeParse({
			workspaceId: validUuid,
			name: "A".repeat(101),
		});
		expect(result.success).toBe(false);
	});

	it("rejects description over 500 characters", () => {
		const result = createProjectSchema.safeParse({
			workspaceId: validUuid,
			name: "Valid Name",
			description: "A".repeat(501),
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid workspace ID", () => {
		const result = createProjectSchema.safeParse({
			workspaceId: "not-a-uuid",
			name: "Valid Name",
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing workspace ID", () => {
		const result = createProjectSchema.safeParse({
			name: "Valid Name",
		});
		expect(result.success).toBe(false);
	});
});

describe("createTaskSchema", () => {
	const validUuid = "550e8400-e29b-41d4-a716-446655440000";

	it("accepts valid task with title only", () => {
		const result = createTaskSchema.safeParse({
			projectId: validUuid,
			title: "Fix the login bug",
		});
		expect(result.success).toBe(true);
	});

	it("accepts task with all optional fields", () => {
		const result = createTaskSchema.safeParse({
			projectId: validUuid,
			title: "Fix the login bug",
			description: "Users can't log in on mobile",
			priority: "high",
			dueDate: "2026-04-01",
		});
		expect(result.success).toBe(true);
	});

	it("defaults priority to medium", () => {
		const result = createTaskSchema.safeParse({
			projectId: validUuid,
			title: "Some task",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.priority).toBe("medium");
		}
	});

	it("rejects empty title", () => {
		const result = createTaskSchema.safeParse({
			projectId: validUuid,
			title: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects title over 200 characters", () => {
		const result = createTaskSchema.safeParse({
			projectId: validUuid,
			title: "A".repeat(201),
		});
		expect(result.success).toBe(false);
	});

	it("rejects description over 2000 characters", () => {
		const result = createTaskSchema.safeParse({
			projectId: validUuid,
			title: "Valid",
			description: "A".repeat(2001),
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid priority value", () => {
		const result = createTaskSchema.safeParse({
			projectId: validUuid,
			title: "Valid",
			priority: "critical",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid project ID", () => {
		const result = createTaskSchema.safeParse({
			projectId: "not-a-uuid",
			title: "Valid",
		});
		expect(result.success).toBe(false);
	});
});

describe("createCommentSchema", () => {
	const validUuid = "550e8400-e29b-41d4-a716-446655440000";

	it("accepts valid comment", () => {
		const result = createCommentSchema.safeParse({
			taskId: validUuid,
			body: "This looks good!",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty body", () => {
		const result = createCommentSchema.safeParse({
			taskId: validUuid,
			body: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects body over 5000 characters", () => {
		const result = createCommentSchema.safeParse({
			taskId: validUuid,
			body: "A".repeat(5001),
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid task ID", () => {
		const result = createCommentSchema.safeParse({
			taskId: "not-a-uuid",
			body: "Valid comment",
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing task ID", () => {
		const result = createCommentSchema.safeParse({
			body: "Valid comment",
		});
		expect(result.success).toBe(false);
	});
});

describe("inviteMemberSchema", () => {
	const validUuid = "550e8400-e29b-41d4-a716-446655440000";

	it("accepts valid invite", () => {
		const result = inviteMemberSchema.safeParse({
			workspaceId: validUuid,
			email: "user@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("defaults role to member", () => {
		const result = inviteMemberSchema.safeParse({
			workspaceId: validUuid,
			email: "user@example.com",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.role).toBe("member");
		}
	});

	it("accepts valid role override", () => {
		const result = inviteMemberSchema.safeParse({
			workspaceId: validUuid,
			email: "user@example.com",
			role: "admin",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid email", () => {
		const result = inviteMemberSchema.safeParse({
			workspaceId: validUuid,
			email: "not-an-email",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid role", () => {
		const result = inviteMemberSchema.safeParse({
			workspaceId: validUuid,
			email: "user@example.com",
			role: "superadmin",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid workspace ID", () => {
		const result = inviteMemberSchema.safeParse({
			workspaceId: "not-a-uuid",
			email: "user@example.com",
		});
		expect(result.success).toBe(false);
	});
});

describe("listActivitySchema", () => {
	const validUuid = "550e8400-e29b-41d4-a716-446655440000";

	it("accepts workspaceId only (no cursor)", () => {
		const result = listActivitySchema.safeParse({
			workspaceId: validUuid,
		});
		expect(result.success).toBe(true);
	});

	it("accepts workspaceId with cursor", () => {
		const result = listActivitySchema.safeParse({
			workspaceId: validUuid,
			cursor: "2026-03-20T09:00:00.000Z",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid workspaceId", () => {
		const result = listActivitySchema.safeParse({
			workspaceId: "not-a-uuid",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid cursor format", () => {
		const result = listActivitySchema.safeParse({
			workspaceId: validUuid,
			cursor: "not-a-datetime",
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing workspaceId", () => {
		const result = listActivitySchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe("addProjectMemberSchema", () => {
	const validUuid = "550e8400-e29b-41d4-a716-446655440000";

	it("accepts valid input", () => {
		const result = addProjectMemberSchema.safeParse({
			projectId: validUuid,
			userId: validUuid,
		});
		expect(result.success).toBe(true);
	});

	it("defaults role to member", () => {
		const result = addProjectMemberSchema.safeParse({
			projectId: validUuid,
			userId: validUuid,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.role).toBe("member");
		}
	});

	it("accepts valid role override", () => {
		const result = addProjectMemberSchema.safeParse({
			projectId: validUuid,
			userId: validUuid,
			role: "lead",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid role", () => {
		const result = addProjectMemberSchema.safeParse({
			projectId: validUuid,
			userId: validUuid,
			role: "admin",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid project ID", () => {
		const result = addProjectMemberSchema.safeParse({
			projectId: "not-a-uuid",
			userId: validUuid,
		});
		expect(result.success).toBe(false);
	});
});
