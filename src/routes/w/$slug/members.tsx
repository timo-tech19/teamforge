import {
	createFileRoute,
	getRouteApi,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { LogOut, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import { InviteMemberDialog } from "#/components/invite-member-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Spinner } from "#/components/ui/spinner";
import UserAvatar from "#/components/user-avatar";
import {
	listMembers,
	removeMember,
	updateMemberRole,
} from "#/lib/member/functions";
import { getWorkspaceBySlug } from "#/lib/workspace/functions";

export const Route = createFileRoute("/w/$slug/members")({
	loader: async ({ params }) => {
		const workspace = await getWorkspaceBySlug({
			data: { slug: params.slug },
		});
		if (!workspace) {
			throw redirect({ to: "/workspaces" });
		}
		const members = await listMembers({
			data: { workspaceId: workspace.id },
		});
		return { members };
	},
	component: MembersPage,
});

const workspaceRoute = getRouteApi("/w/$slug");

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
	owner: "default",
	admin: "secondary",
	member: "outline",
	viewer: "outline",
};

const roleLabels: Record<string, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
	viewer: "Viewer",
};

function MembersPage() {
	const { workspace } = workspaceRoute.useLoaderData();
	const { user } = Route.useRouteContext();
	const { members } = Route.useLoaderData();
	const router = useRouter();
	const [loadingAction, setLoadingAction] = useState<string | null>(null);

	const wsRole = workspace.role;
	const isOwner = wsRole === "owner";
	const isAdmin = wsRole === "admin" || isOwner;

	async function handleRoleChange(userId: string, newRole: string) {
		setLoadingAction(userId);
		await updateMemberRole({
			data: {
				workspaceId: workspace.id,
				userId,
				role: newRole as "owner" | "admin" | "member" | "viewer",
			},
		});
		setLoadingAction(null);
		await router.invalidate();
	}

	async function handleRemove(userId: string) {
		setLoadingAction(userId);
		await removeMember({
			data: { workspaceId: workspace.id, userId },
		});
		setLoadingAction(null);

		// If removing yourself, redirect to workspaces
		if (userId === user.id) {
			window.location.href = "/workspaces";
			return;
		}

		await router.invalidate();
	}

	return (
		<div className="p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-bold text-foreground">Members</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{members.length} member{members.length !== 1 ? "s" : ""} in{" "}
						{workspace.name}
					</p>
				</div>
				{isAdmin && (
					<InviteMemberDialog workspaceId={workspace.id}>
						<Button>
							<UserPlus />
							Invite member
						</Button>
					</InviteMemberDialog>
				)}
			</div>

			<div className="mt-8 space-y-2">
				{members.map((member) => {
					const isSelf = member.userId === user.id;
					const isMemberOwner = member.role === "owner";
					const canChangeRole = isAdmin && !isMemberOwner && !isSelf;
					const canRemove =
						(isOwner && !isMemberOwner) || (isSelf && !isMemberOwner);
					const isLoading = loadingAction === member.userId;

					return (
						<div
							key={member.userId}
							className="flex items-center gap-4 rounded-lg border border-border p-4"
						>
							<UserAvatar
								displayName={member.displayName}
								avatarUrl={member.avatarUrl}
							/>
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<span className="font-medium text-foreground">
										{member.displayName}
									</span>
									{isSelf && (
										<span className="text-xs text-muted-foreground">(you)</span>
									)}
								</div>
								<div className="mt-0.5 flex items-center gap-2">
									<Badge variant={roleBadgeVariant[member.role] ?? "outline"}>
										<Shield className="size-2.5" />
										{roleLabels[member.role] ?? member.role}
									</Badge>
									{member.status === "pending" && (
										<Badge variant="outline" className="text-amber-600">
											Pending
										</Badge>
									)}
								</div>
							</div>

							{(canChangeRole || canRemove) && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" disabled={isLoading}>
											{isLoading ? <Spinner /> : "Manage"}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{canChangeRole && (
											<>
												{member.role !== "admin" && (
													<DropdownMenuItem
														onClick={() =>
															handleRoleChange(member.userId, "admin")
														}
													>
														Make Admin
													</DropdownMenuItem>
												)}
												{member.role !== "member" && (
													<DropdownMenuItem
														onClick={() =>
															handleRoleChange(member.userId, "member")
														}
													>
														Make Member
													</DropdownMenuItem>
												)}
												{member.role !== "viewer" && (
													<DropdownMenuItem
														onClick={() =>
															handleRoleChange(member.userId, "viewer")
														}
													>
														Make Viewer
													</DropdownMenuItem>
												)}
												<DropdownMenuSeparator />
											</>
										)}
										{canRemove && (
											<DropdownMenuItem
												onClick={() => handleRemove(member.userId)}
												className="text-destructive-foreground"
											>
												<LogOut className="size-3.5" />
												{isSelf ? "Leave workspace" : "Remove member"}
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
