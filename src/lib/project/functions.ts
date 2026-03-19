import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const createProjectSchema = z.object({
	workspaceId: z.uuid(),
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(100, "Name must be under 100 characters"),
	description: z
		.string()
		.max(500, "Description must be under 500 characters")
		.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const listProjects = createServerFn({ method: "GET" })
	.inputValidator(z.object({ workspaceId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { data: projects, error } = await supabase
			.from("projects")
			.select("id, name, description, status, created_at")
			.eq("workspace_id", data.workspaceId)
			.order("created_at", { ascending: false });

		if (error) {
			throw new Error(error.message);
		}

		return projects.map((project) => ({
			id: project.id,
			name: project.name,
			description: project.description,
			status: project.status,
			createdAt: project.created_at,
		}));
	});

export const getProjectById = createServerFn({ method: "GET" })
	.inputValidator(z.object({ projectId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		// Fetch project without membership join — workspace admins can see
		// projects without being project members (two-path SELECT policy).
		const { data: project, error } = await supabase
			.from("projects")
			.select(
				"id, name, description, status, workspace_id, created_by, created_at",
			)
			.eq("id", data.projectId)
			.single();

		if (error) {
			return null;
		}

		// Separately fetch the current user's project role (if any)
		const { data: membership } = await supabase
			.from("project_members")
			.select("role")
			.eq("project_id", data.projectId)
			.eq("user_id", user?.id ?? "")
			.single();

		return {
			id: project.id,
			name: project.name,
			description: project.description,
			status: project.status,
			workspaceId: project.workspace_id,
			createdBy: project.created_by,
			createdAt: project.created_at,
			role: membership?.role ?? null,
		};
	});

export const createProject = createServerFn({ method: "POST" })
	.inputValidator(createProjectSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { error: "Not authenticated" };
		}

		// Generate ID upfront so we can return it without chaining .select().
		// Same pattern as createWorkspace — the AFTER INSERT trigger that adds
		// the creator as lead hasn't fired yet when RETURNING evaluates, so
		// .select() would hit the SELECT RLS policy and fail.
		const projectId = crypto.randomUUID();

		const { error } = await supabase.from("projects").insert({
			id: projectId,
			workspace_id: data.workspaceId,
			name: data.name,
			description: data.description ?? null,
			created_by: user.id,
		});

		if (error) {
			return { error: error.message };
		}

		return { error: null, projectId };
	});

export const updateProject = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z
				.string()
				.min(2, "Name must be at least 2 characters")
				.max(100, "Name must be under 100 characters"),
			description: z
				.string()
				.max(500, "Description must be under 500 characters")
				.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase
			.from("projects")
			.update({
				name: data.name,
				description: data.description ?? null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const deleteProject = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase
			.from("projects")
			.delete()
			.eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});
