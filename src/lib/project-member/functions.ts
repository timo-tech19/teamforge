import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

const projectRoleEnum = z.enum(["lead", "member", "viewer"]);

export const addProjectMemberSchema = z.object({
	projectId: z.uuid(),
	userId: z.uuid(),
	role: projectRoleEnum.optional().default("member"),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

export const listProjectMembers = createServerFn({ method: "GET" })
	.inputValidator(z.object({ projectId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const { data: members, error } = await supabase
			.from("project_members")
			.select("user_id, role, joined_at")
			.eq("project_id", data.projectId)
			.order("joined_at", { ascending: true });

		if (error) {
			throw new Error(error.message);
		}

		const userIds = members.map((m) => m.user_id);
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id, display_name, avatar_url")
			.in("id", userIds);

		const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

		return members.map((member) => {
			const profile = profileMap.get(member.user_id);
			return {
				userId: member.user_id,
				role: member.role,
				joinedAt: member.joined_at,
				displayName: profile?.display_name ?? "Unknown",
				avatarUrl: profile?.avatar_url ?? null,
			};
		});
	});

// List workspace members who are NOT yet in this project.
// Used by the "Add member" dialog to show available people.
export const listAvailableMembers = createServerFn({ method: "GET" })
	.inputValidator(z.object({ projectId: z.uuid(), workspaceId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// Get current project member IDs
		const { data: projectMembers } = await supabase
			.from("project_members")
			.select("user_id")
			.eq("project_id", data.projectId);

		const existingIds = new Set((projectMembers ?? []).map((m) => m.user_id));

		// Get active workspace members
		const { data: wsMembers, error } = await supabase
			.from("workspace_members")
			.select("user_id")
			.eq("workspace_id", data.workspaceId)
			.eq("status", "active");

		if (error) {
			throw new Error(error.message);
		}

		// Filter out those already in the project
		const availableIds = wsMembers
			.map((m) => m.user_id)
			.filter((id) => !existingIds.has(id));

		if (availableIds.length === 0) return [];

		// Fetch profiles
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id, display_name, avatar_url")
			.in("id", availableIds);

		return (profiles ?? []).map((p) => ({
			userId: p.id,
			displayName: p.display_name,
			avatarUrl: p.avatar_url,
		}));
	});

export const addProjectMember = createServerFn({ method: "POST" })
	.inputValidator(addProjectMemberSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// RLS enforces: only project leads or workspace admins can insert
		const { error } = await supabase.from("project_members").insert({
			project_id: data.projectId,
			user_id: data.userId,
			role: data.role ?? "member",
		});

		if (error) {
			if (error.code === "23505") {
				return { error: "This user is already a member of the project" };
			}
			return { error: error.message };
		}

		return { error: null };
	});

export const updateProjectMemberRole = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			projectId: z.uuid(),
			userId: z.uuid(),
			role: projectRoleEnum,
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const { error } = await supabase
			.from("project_members")
			.update({ role: data.role })
			.eq("project_id", data.projectId)
			.eq("user_id", data.userId);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const removeProjectMember = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			projectId: z.uuid(),
			userId: z.uuid(),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const { error } = await supabase
			.from("project_members")
			.delete()
			.eq("project_id", data.projectId)
			.eq("user_id", data.userId);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});
