import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "#/lib/auth/functions";
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
