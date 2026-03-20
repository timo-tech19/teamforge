import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const listMyTasksSchema = z.object({
	workspaceId: z.uuid(),
});

export type ListMyTasksInput = z.infer<typeof listMyTasksSchema>;

/**
 * Fetch all tasks assigned to the current user across all projects
 * in the workspace. Returns tasks grouped by project with project name.
 */
export const listMyTasks = createServerFn({ method: "GET" })
	.inputValidator(listMyTasksSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			throw new Error("Not authenticated");
		}

		// Get all projects in this workspace (RLS scoped)
		const { data: projects } = await supabase
			.from("projects")
			.select("id, name")
			.eq("workspace_id", data.workspaceId);

		const projectIds = (projects ?? []).map((p) => p.id);
		if (projectIds.length === 0) {
			return [];
		}

		const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

		// Fetch tasks assigned to the current user across all projects
		const { data: tasks, error } = await supabase
			.from("tasks")
			.select(
				"id, title, description, status, priority, position, due_date, assigned_to, project_id, created_at",
			)
			.in("project_id", projectIds)
			.eq("assigned_to", user.id)
			.order("created_at", { ascending: false });

		if (error) {
			throw new Error(error.message);
		}

		return tasks.map((task) => ({
			id: task.id,
			title: task.title,
			description: task.description,
			status: task.status,
			priority: task.priority,
			position: task.position,
			dueDate: task.due_date,
			assignedTo: task.assigned_to,
			projectId: task.project_id,
			projectName: projectMap.get(task.project_id) ?? "Unknown",
			createdAt: task.created_at,
		}));
	});
