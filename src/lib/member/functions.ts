import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

const workspaceRoleEnum = z.enum(["owner", "admin", "member", "viewer"]);

export const inviteMemberSchema = z.object({
	workspaceId: z.uuid(),
	email: z.email("Please enter a valid email address"),
	role: workspaceRoleEnum.optional().default("member"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const listMembers = createServerFn({ method: "GET" })
	.inputValidator(z.object({ workspaceId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// Fetch workspace members
		const { data: members, error } = await supabase
			.from("workspace_members")
			.select("user_id, role, status, joined_at")
			.eq("workspace_id", data.workspaceId)
			.order("joined_at", { ascending: true });

		if (error) {
			throw new Error(error.message);
		}

		// Batch-fetch profiles for all member user IDs
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
				status: member.status,
				joinedAt: member.joined_at,
				displayName: profile?.display_name ?? "Unknown",
				avatarUrl: profile?.avatar_url ?? null,
			};
		});
	});

export const inviteMember = createServerFn({ method: "POST" })
	.inputValidator(inviteMemberSchema)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// Look up user by email using our SECURITY DEFINER function.
		// This is an RPC call to a Postgres function, not a table query.
		const { data: userId, error: lookupError } = await supabase.rpc(
			"find_user_id_by_email",
			{ _email: data.email },
		);

		if (lookupError) {
			return { error: lookupError.message };
		}

		if (!userId) {
			return { error: "No user found with that email address" };
		}

		// Check if already a member
		const { data: existing } = await supabase
			.from("workspace_members")
			.select("user_id")
			.eq("workspace_id", data.workspaceId)
			.eq("user_id", userId)
			.single();

		if (existing) {
			return { error: "This user is already a member of the workspace" };
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();

		// Insert membership — RLS enforces that only owners/admins can do this
		const { error: insertError } = await supabase
			.from("workspace_members")
			.insert({
				user_id: userId,
				workspace_id: data.workspaceId,
				role: data.role ?? "member",
				status: "pending",
				invited_by: user?.id ?? null,
			});

		if (insertError) {
			return { error: insertError.message };
		}

		return { error: null };
	});

export const updateMemberRole = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			workspaceId: z.uuid(),
			userId: z.uuid(),
			role: workspaceRoleEnum,
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// RLS enforces that only owners/admins can update
		const { error } = await supabase
			.from("workspace_members")
			.update({ role: data.role })
			.eq("workspace_id", data.workspaceId)
			.eq("user_id", data.userId);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const listPendingInvitations = createServerFn({ method: "GET" }).handler(
	async () => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return [];

		// The "Users can view own memberships" policy lets us see our
		// pending rows. Join to workspaces for display info.
		const { data: invitations, error } = await supabase
			.from("workspace_members")
			.select(
				`
				workspace_id,
				role,
				joined_at,
				workspaces!inner (
					name,
					slug
				)
			`,
			)
			.eq("user_id", user.id)
			.eq("status", "pending");

		if (error) {
			throw new Error(error.message);
		}

		return invitations.map((inv) => ({
			workspaceId: inv.workspace_id,
			role: inv.role,
			invitedAt: inv.joined_at,
			workspaceName: inv.workspaces.name,
			workspaceSlug: inv.workspaces.slug,
		}));
	},
);

export const acceptInvitation = createServerFn({ method: "POST" })
	.inputValidator(z.object({ workspaceId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { error: "Not authenticated" };
		}

		// The "Pending members can accept invite" policy allows this:
		// updates own row from pending → active. RLS rejects anything else.
		const { error } = await supabase
			.from("workspace_members")
			.update({ status: "active" })
			.eq("workspace_id", data.workspaceId)
			.eq("user_id", user.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const declineInvitation = createServerFn({ method: "POST" })
	.inputValidator(z.object({ workspaceId: z.uuid() }))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { error: "Not authenticated" };
		}

		// Uses the existing "self-remove" DELETE policy
		const { error } = await supabase
			.from("workspace_members")
			.delete()
			.eq("workspace_id", data.workspaceId)
			.eq("user_id", user.id);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const removeMember = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			workspaceId: z.uuid(),
			userId: z.uuid(),
		}),
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();

		// RLS enforces: owner can remove anyone, or you can remove yourself
		const { error } = await supabase
			.from("workspace_members")
			.delete()
			.eq("workspace_id", data.workspaceId)
			.eq("user_id", data.userId);

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});
