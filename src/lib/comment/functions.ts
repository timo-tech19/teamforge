import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const createCommentSchema = z.object({
	taskId: z.uuid(),
	body: z
		.string()
		.min(1, "Comment cannot be empty")
		.max(5000, "Comment must be under 5000 characters"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const listCommentsByTask = createServerFn({ method: "GET" })
	.inputValidator(z.object({ taskId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		// comments.author_id references auth.users, not profiles directly.
		// Fetch comments first, then batch-fetch profiles for all authors.
		const { data: comments, error } = await supabase
			.from("comments")
			.select("id, body, edited_at, created_at, author_id")
			.eq("task_id", data.taskId)
			.order("created_at", { ascending: true });

		if (error) {
			throw new Error(error.message);
		}

		// Get unique author IDs and fetch their profiles
		const authorIds = [...new Set(comments.map((c) => c.author_id))];
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id, display_name, avatar_url")
			.in("id", authorIds);

		const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

		return comments.map((comment) => {
			const profile = profileMap.get(comment.author_id);
			return {
				id: comment.id,
				body: comment.body,
				editedAt: comment.edited_at,
				createdAt: comment.created_at,
				authorId: comment.author_id,
				authorName: profile?.display_name ?? "Unknown",
				authorAvatar: profile?.avatar_url ?? null,
			};
		});
	});

export const createComment = createServerFn({ method: "POST" })
	.inputValidator(createCommentSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { error: "Not authenticated" };
		}

		const { error } = await supabase.from("comments").insert({
			task_id: data.taskId,
			author_id: user.id,
			body: data.body,
		});

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const updateComment = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			body: z
				.string()
				.min(1, "Comment cannot be empty")
				.max(5000, "Comment must be under 5000 characters"),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase
			.from("comments")
			.update({
				body: data.body,
				edited_at: new Date().toISOString(),
			})
			.eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const deleteComment = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase
			.from("comments")
			.delete()
			.eq("id", data.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});
