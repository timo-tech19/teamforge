import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

/**
 * Fetch the current user's upcoming tasks (next 5, sorted by due date).
 */
export const listUpcomingTasks = createServerFn({ method: "GET" })
	.inputValidator(z.object({ workspaceId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return [];

		// Get workspace project IDs
		const { data: projects } = await supabase
			.from("projects")
			.select("id, name")
			.eq("workspace_id", data.workspaceId);

		const projectIds = (projects ?? []).map((p) => p.id);
		if (projectIds.length === 0) return [];

		const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

		const { data: tasks } = await supabase
			.from("tasks")
			.select("id, title, status, priority, due_date, project_id, assigned_to")
			.in("project_id", projectIds)
			.eq("assigned_to", user.id)
			.neq("status", "done")
			.not("due_date", "is", null)
			.order("due_date", { ascending: true })
			.limit(5);

		return (tasks ?? []).map((t) => ({
			id: t.id,
			title: t.title,
			status: t.status,
			priority: t.priority,
			dueDate: t.due_date,
			projectId: t.project_id,
			projectName: projectMap.get(t.project_id) ?? "Unknown",
		}));
	});

/**
 * Fetch recent activity for the workspace (last 10 items).
 */
export const listRecentActivity = createServerFn({ method: "GET" })
	.inputValidator(z.object({ workspaceId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const { data: entries, error } = await supabase
			.from("activity_log")
			.select("id, actor_id, action, metadata, created_at, project_id")
			.eq("workspace_id", data.workspaceId)
			.order("created_at", { ascending: false })
			.limit(10);

		if (error) throw new Error(error.message);

		// Batch-fetch actor profiles
		const actorIds = [
			...new Set(
				(entries ?? [])
					.filter((e) => e.actor_id)
					.map((e) => e.actor_id as string),
			),
		];
		const { data: profiles } =
			actorIds.length > 0
				? await supabase
						.from("profiles")
						.select("id, display_name, avatar_url")
						.in("id", actorIds)
				: { data: [] };

		const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

		return (entries ?? []).map((entry) => {
			const actor = entry.actor_id ? profileMap.get(entry.actor_id) : null;
			return {
				id: entry.id,
				action: entry.action,
				metadata: entry.metadata as Record<string, string> | null,
				createdAt: entry.created_at,
				actorName: actor?.display_name ?? "Unknown",
				actorAvatar: actor?.avatar_url ?? null,
			};
		});
	});
