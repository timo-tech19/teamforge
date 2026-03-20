import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

const PAGE_SIZE = 20;

export const listActivitySchema = z.object({
	workspaceId: z.uuid(),
	cursor: z.string().datetime().optional(),
});

export type ListActivityInput = z.infer<typeof listActivitySchema>;

/**
 * Fetch workspace activity with cursor pagination.
 *
 * Cursor = `created_at` of the last item on the previous page.
 * Returns `PAGE_SIZE` items where `created_at < cursor`, newest first.
 * The composite index on (workspace_id, created_at DESC) makes this
 * a fast index seek rather than a scan-and-skip.
 */
export const listActivityByWorkspace = createServerFn({ method: "GET" })
	.inputValidator(listActivitySchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		let query = supabase
			.from("activity_log")
			.select(
				"id, workspace_id, project_id, actor_id, action, metadata, created_at",
			)
			.eq("workspace_id", data.workspaceId)
			.order("created_at", { ascending: false })
			.limit(PAGE_SIZE + 1); // Fetch one extra to detect if there's a next page

		if (data.cursor) {
			query = query.lt("created_at", data.cursor);
		}

		const { data: entries, error } = await query;

		if (error) {
			throw new Error(error.message);
		}

		// Determine if there are more pages
		const hasMore = entries.length > PAGE_SIZE;
		const page = hasMore ? entries.slice(0, PAGE_SIZE) : entries;

		// Batch-fetch actor profiles
		const actorIds = [
			...new Set(
				page.filter((e) => e.actor_id).map((e) => e.actor_id as string),
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

		// Batch-fetch project names for entries that have a project_id
		const projectIds = [
			...new Set(
				page.filter((e) => e.project_id).map((e) => e.project_id as string),
			),
		];
		const { data: projects } =
			projectIds.length > 0
				? await supabase
						.from("projects")
						.select("id, name")
						.in("id", projectIds)
				: { data: [] };

		const projectMap = new Map((projects ?? []).map((p) => [p.id, p]));

		const items = page.map((entry) => {
			const actor = entry.actor_id ? profileMap.get(entry.actor_id) : null;
			const project = entry.project_id
				? projectMap.get(entry.project_id)
				: null;
			return {
				id: entry.id,
				action: entry.action,
				metadata: entry.metadata as Record<string, string> | null,
				createdAt: entry.created_at,
				actorId: entry.actor_id,
				actorName: actor?.display_name ?? "Unknown",
				actorAvatar: actor?.avatar_url ?? null,
				projectId: entry.project_id,
				projectName: project?.name ?? null,
			};
		});

		const nextCursor = hasMore ? page[page.length - 1].created_at : null;

		return { items, nextCursor };
	});
