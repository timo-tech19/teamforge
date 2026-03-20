import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import type { Task } from "#/components/kanban-board";
import { getSupabaseBrowserClient } from "#/lib/supabase/client";

/**
 * Maps a raw database row from a Realtime event payload into the
 * camelCase Task shape used by the kanban board.
 */
export function rowToTask(row: Record<string, unknown>): Task {
	return {
		id: row.id as string,
		title: row.title as string,
		description: (row.description as string) ?? null,
		status: row.status as string,
		priority: row.priority as string,
		position: row.position as number,
		dueDate: (row.due_date as string) ?? null,
		assignedTo: (row.assigned_to as string) ?? null,
		// Realtime payloads don't include profile data — these will be
		// filled on the next refetch (fetch-on-reconnect or router.invalidate)
		assigneeName: null,
		assigneeAvatar: null,
		createdBy: (row.created_by as string) ?? null,
		createdAt: row.created_at as string,
	};
}

type UseRealtimeTasksOptions = {
	/** The project whose tasks we're watching. */
	projectId: string;
	/** The current user's ID — used to skip own changes. */
	currentUserId: string;
	/** Called when a task is inserted by another user. */
	onInsert: (task: Task) => void;
	/** Called when a task is updated by another user. */
	onUpdate: (task: Task, oldTask: Task) => void;
	/** Called when a task is deleted by another user. */
	onDelete: (taskId: string) => void;
	/** Called on SUBSCRIBED status to fill gaps from disconnection. */
	onReconnect: () => void;
};

/**
 * Subscribes to Supabase Realtime postgres_changes on the tasks table,
 * filtered by project_id.  Calls the provided callbacks for remote
 * changes (skips events caused by the current user) and refetches on
 * every (re)connection.
 */
export function useRealtimeTasks({
	projectId,
	currentUserId,
	onInsert,
	onUpdate,
	onDelete,
	onReconnect,
}: UseRealtimeTasksOptions) {
	// Store callbacks in refs so the subscription doesn't re-create
	// every time the parent re-renders with new inline functions.
	const callbacksRef = useRef({
		onInsert,
		onUpdate,
		onDelete,
		onReconnect,
	});
	callbacksRef.current = { onInsert, onUpdate, onDelete, onReconnect };

	useEffect(() => {
		const supabase = getSupabaseBrowserClient();

		const channel: RealtimeChannel = supabase
			.channel(`project:${projectId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "tasks",
					filter: `project_id=eq.${projectId}`,
				},
				(payload) => {
					const task = rowToTask(payload.new);
					// Skip if we created this task ourselves — the board
					// already shows it via router.invalidate().
					if (task.createdBy === currentUserId) return;
					callbacksRef.current.onInsert(task);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "tasks",
					filter: `project_id=eq.${projectId}`,
				},
				(payload) => {
					const task = rowToTask(payload.new);
					const oldTask = rowToTask(payload.old as Record<string, unknown>);
					callbacksRef.current.onUpdate(task, oldTask);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "tasks",
					filter: `project_id=eq.${projectId}`,
				},
				(payload) => {
					const oldRow = payload.old as Record<string, unknown>;
					callbacksRef.current.onDelete(oldRow.id as string);
				},
			)
			.subscribe((status) => {
				// Fetch-on-reconnect: fires on initial connection AND
				// every reconnection after a network drop.
				if (status === "SUBSCRIBED") {
					callbacksRef.current.onReconnect();
				}
			});

		// Cleanup: remove the channel when the component unmounts
		// or when projectId/currentUserId changes.
		return () => {
			supabase.removeChannel(channel);
		};
	}, [projectId, currentUserId]);
}
