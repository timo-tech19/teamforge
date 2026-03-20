import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const searchWorkspaceSchema = z.object({
	workspaceId: z.uuid(),
	query: z.string().min(1).max(100),
});

export type SearchWorkspaceInput = z.infer<typeof searchWorkspaceSchema>;

/**
 * Search across projects, tasks, and members in a workspace.
 * Returns up to 5 results per category. Uses `ilike` for
 * case-insensitive partial matching.
 */
export const searchWorkspace = createServerFn({ method: "GET" })
	.inputValidator(searchWorkspaceSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const pattern = `%${data.query}%`;

		// Fetch project IDs first (needed to scope task search)
		const { data: workspaceProjects } = await supabase
			.from("projects")
			.select("id")
			.eq("workspace_id", data.workspaceId);

		const projectIds = (workspaceProjects ?? []).map((p) => p.id);

		// Query all three categories in parallel
		const [projectsResult, tasksResult, membersResult] = await Promise.all([
			supabase
				.from("projects")
				.select("id, name, status")
				.eq("workspace_id", data.workspaceId)
				.ilike("name", pattern)
				.limit(5),
			projectIds.length > 0
				? supabase
						.from("tasks")
						.select("id, title, status, project_id")
						.in("project_id", projectIds)
						.ilike("title", pattern)
						.limit(5)
				: Promise.resolve({ data: [], error: null }),
			supabase
				.from("workspace_members")
				.select("user_id")
				.eq("workspace_id", data.workspaceId)
				.eq("status", "active"),
		]);

		// Batch-fetch profiles for matching members
		const memberIds = (membersResult.data ?? []).map((m) => m.user_id);
		const { data: profiles } =
			memberIds.length > 0
				? await supabase
						.from("profiles")
						.select("id, display_name, avatar_url")
						.in("id", memberIds)
						.ilike("display_name", pattern)
						.limit(5)
				: { data: [] };

		return {
			projects: (projectsResult.data ?? []).map((p) => ({
				id: p.id,
				name: p.name,
				status: p.status,
			})),
			tasks: (tasksResult.data ?? []).map((t) => ({
				id: t.id,
				title: t.title,
				status: t.status,
				projectId: t.project_id,
			})),
			members: (profiles ?? []).map((p) => ({
				userId: p.id,
				displayName: p.display_name,
				avatarUrl: p.avatar_url,
			})),
		};
	});
