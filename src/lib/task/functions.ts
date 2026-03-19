import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

const taskStatusEnum = z.enum([
	"backlog",
	"todo",
	"in_progress",
	"in_review",
	"done",
]);

const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const createTaskSchema = z.object({
	projectId: z.uuid(),
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be under 200 characters"),
	description: z
		.string()
		.max(2000, "Description must be under 2000 characters")
		.optional(),
	priority: taskPriorityEnum.optional().default("medium"),
	assignedTo: z.uuid().optional(),
	dueDate: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const listTasksByProject = createServerFn({ method: "GET" })
	.inputValidator(z.object({ projectId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { data: tasks, error } = await supabase
			.from("tasks")
			.select(
				`
				id,
				title,
				description,
				status,
				priority,
				position,
				due_date,
				assigned_to,
				created_by,
				created_at
			`,
			)
			.eq("project_id", data.projectId)
			.order("position", { ascending: true });

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
			createdBy: task.created_by,
			createdAt: task.created_at,
		}));
	});

export const createTask = createServerFn({ method: "POST" })
	.inputValidator(createTaskSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { error: "Not authenticated" };
		}

		// Get the highest position in this project for the target status (backlog)
		// so the new task appears at the bottom of the column.
		const { data: lastTask } = await supabase
			.from("tasks")
			.select("position")
			.eq("project_id", data.projectId)
			.eq("status", "backlog")
			.order("position", { ascending: false })
			.limit(1)
			.single();

		const nextPosition = (lastTask?.position ?? -1) + 1;

		const { error } = await supabase.from("tasks").insert({
			project_id: data.projectId,
			title: data.title,
			description: data.description ?? null,
			priority: data.priority ?? "medium",
			assigned_to: data.assignedTo ?? null,
			due_date: data.dueDate ?? null,
			position: nextPosition,
			created_by: user.id,
		});

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const updateTask = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			title: z
				.string()
				.min(1, "Title is required")
				.max(200, "Title must be under 200 characters")
				.optional(),
			description: z
				.string()
				.max(2000, "Description must be under 2000 characters")
				.nullable()
				.optional(),
			status: taskStatusEnum.optional(),
			priority: taskPriorityEnum.optional(),
			assignedTo: z.uuid().nullable().optional(),
			dueDate: z.string().nullable().optional(),
			position: z.number().int().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const updates: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};
		if (data.title !== undefined) updates.title = data.title;
		if (data.description !== undefined) updates.description = data.description;
		if (data.status !== undefined) updates.status = data.status;
		if (data.priority !== undefined) updates.priority = data.priority;
		if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo;
		if (data.dueDate !== undefined) updates.due_date = data.dueDate;
		if (data.position !== undefined) updates.position = data.position;

		const { error } = await supabase
			.from("tasks")
			.update(updates)
			.eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const deleteTask = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase.from("tasks").delete().eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const reorderTasks = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			tasks: z.array(
				z.object({
					id: z.uuid(),
					status: taskStatusEnum,
					position: z.number().int(),
				}),
			),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// Update each task's status and position. This is a batch of
		// individual updates — acceptable for kanban reordering since
		// columns rarely exceed 20-30 items.
		for (const task of data.tasks) {
			const { error } = await supabase
				.from("tasks")
				.update({
					status: task.status,
					position: task.position,
					updated_at: new Date().toISOString(),
				})
				.eq("id", task.id);

			if (error) {
				return { error: error.message };
			}
		}

		return { error: null };
	});
