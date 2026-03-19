import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceDialog } from "#/components/create-workspace-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { getUser } from "#/lib/auth/functions";
import {
	acceptInvitation,
	declineInvitation,
	listPendingInvitations,
} from "#/lib/member/functions";
import { listWorkspaces } from "#/lib/workspace/functions";

export const Route = createFileRoute("/_public/workspaces")({
	beforeLoad: async () => {
		const user = await getUser();
		if (!user) {
			throw redirect({ to: "/login" });
		}
		return { user };
	},
	loader: async () => {
		const [workspaces, invitations] = await Promise.all([
			listWorkspaces(),
			listPendingInvitations(),
		]);
		return { workspaces, invitations };
	},
	component: WorkspacesPage,
});

function InvitationCard({
	invitation,
}: {
	invitation: {
		workspaceId: string;
		role: string;
		workspaceName: string;
		workspaceSlug: string;
	};
}) {
	const router = useRouter();
	const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

	async function handleAccept() {
		setLoading("accept");
		const result = await acceptInvitation({
			data: { workspaceId: invitation.workspaceId },
		});
		setLoading(null);
		if (!result.error) {
			await router.invalidate();
		}
	}

	async function handleDecline() {
		setLoading("decline");
		const result = await declineInvitation({
			data: { workspaceId: invitation.workspaceId },
		});
		setLoading(null);
		if (!result.error) {
			await router.invalidate();
		}
	}

	return (
		<div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
				<span className="text-sm font-semibold">
					{invitation.workspaceName.charAt(0).toUpperCase()}
				</span>
			</div>
			<div className="flex-1">
				<h3 className="font-semibold text-foreground">
					{invitation.workspaceName}
				</h3>
				<div className="mt-0.5 flex items-center gap-2">
					<span className="text-xs text-muted-foreground">Invited as</span>
					<Badge variant="outline">{invitation.role}</Badge>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button size="sm" onClick={handleAccept} disabled={loading !== null}>
					{loading === "accept" ? <Spinner /> : <Check className="size-3.5" />}
					Accept
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={handleDecline}
					disabled={loading !== null}
				>
					{loading === "decline" ? <Spinner /> : <X className="size-3.5" />}
					Decline
				</Button>
			</div>
		</div>
	);
}

function WorkspacesPage() {
	const { workspaces, invitations } = Route.useLoaderData();

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
				<CreateWorkspaceDialog>
					<Button>
						<Plus />
						New workspace
					</Button>
				</CreateWorkspaceDialog>
			</div>

			{/* Pending invitations */}
			{invitations.length > 0 && (
				<div className="mt-8">
					<h2 className="mb-3 text-sm font-medium text-muted-foreground">
						Pending invitations
					</h2>
					<div className="space-y-2">
						{invitations.map((invitation) => (
							<InvitationCard
								key={invitation.workspaceId}
								invitation={invitation}
							/>
						))}
					</div>
				</div>
			)}

			{/* Workspace list */}
			{workspaces.length === 0 && invitations.length === 0 ? (
				<div className="mt-16 text-center">
					<h2 className="text-lg font-semibold text-foreground">
						No workspaces yet
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Create your first workspace to get started.
					</p>
					<div className="mt-6">
						<CreateWorkspaceDialog>
							<Button>
								<Plus />
								Create workspace
							</Button>
						</CreateWorkspaceDialog>
					</div>
				</div>
			) : workspaces.length > 0 ? (
				<div className="mt-8 space-y-2">
					{workspaces.map((workspace) => (
						<Link
							key={workspace.id}
							to="/w/$slug"
							params={{ slug: workspace.slug }}
							className="group flex items-center gap-4 rounded-lg border border-border p-4 no-underline transition hover:bg-accent"
						>
							<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
								<span className="text-sm font-semibold">
									{workspace.name.charAt(0).toUpperCase()}
								</span>
							</div>
							<div className="flex-1">
								<h2 className="font-semibold text-foreground">
									{workspace.name}
								</h2>
								<span className="text-xs text-muted-foreground">
									{workspace.role}
								</span>
							</div>
							<ArrowRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
						</Link>
					))}
				</div>
			) : null}
		</main>
	);
}
