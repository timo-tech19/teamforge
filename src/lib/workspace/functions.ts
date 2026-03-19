import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const createWorkspaceSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(50, "Name must be under 50 characters"),
	slug: z
		.string()
		.min(2, "Slug must be at least 2 characters")
		.max(40, "Slug must be under 40 characters")
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
			"Slug can only contain lowercase letters, numbers, and hyphens",
		),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const listWorkspaces = createServerFn({ method: "GET" }).handler(
	async () => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		const { data, error } = await supabase
			.from("workspaces")
			.select(
				`
				id,
				name,
				slug,
				created_at,
				workspace_members!inner (
					role,
					status
				)
			`,
			)
			.eq("workspace_members.user_id", user?.id ?? "")
			.eq("workspace_members.status", "active")
			.order("created_at", { ascending: false });

		if (error) {
			throw new Error(error.message);
		}

		return data.map((workspace) => ({
			id: workspace.id,
			name: workspace.name,
			slug: workspace.slug,
			createdAt: workspace.created_at,
			role: workspace.workspace_members[0]?.role,
			status: workspace.workspace_members[0]?.status,
		}));
	},
);

export const getWorkspaceBySlug = createServerFn({ method: "GET" })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// Get the current user's ID so we can filter the membership join
		// to only their row. Without this, workspace_members returns ALL
		// members visible to the user, and [0] could be anyone's role.
		const {
			data: { user },
		} = await supabase.auth.getUser();

		const { data: workspace, error } = await supabase
			.from("workspaces")
			.select(
				`
				id,
				name,
				slug,
				created_by,
				created_at,
				workspace_members!inner (
					role,
					status
				)
			`,
			)
			.eq("slug", data.slug)
			.eq("workspace_members.user_id", user?.id ?? "")
			.single();

		if (error) {
			return null;
		}

		return {
			id: workspace.id,
			name: workspace.name,
			slug: workspace.slug,
			createdBy: workspace.created_by,
			createdAt: workspace.created_at,
			role: workspace.workspace_members[0]?.role,
			status: workspace.workspace_members[0]?.status,
		};
	});

export const createWorkspace = createServerFn({ method: "POST" })
	.inputValidator(createWorkspaceSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { error: "Not authenticated" };
		}

		// Don't chain .select() after .insert() here. The RETURNING clause
		// triggers the SELECT policy which calls is_workspace_member(), but the
		// AFTER INSERT trigger that creates the membership row hasn't fired yet
		// at that point — causing an RLS violation. We already have the slug
		// from the input data so there's no need to read it back.
		const { error } = await supabase.from("workspaces").insert({
			name: data.name,
			slug: data.slug,
			created_by: user.id,
		});

		if (error) {
			if (error.code === "23505") {
				return { error: "A workspace with this slug already exists" };
			}
			return { error: error.message };
		}

		return { error: null, slug: data.slug };
	});

export const updateWorkspace = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z
				.string()
				.min(2, "Name must be at least 2 characters")
				.max(50, "Name must be under 50 characters"),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase
			.from("workspaces")
			.update({ name: data.name, updated_at: new Date().toISOString() })
			.eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const deleteWorkspace = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase
			.from("workspaces")
			.delete()
			.eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});
