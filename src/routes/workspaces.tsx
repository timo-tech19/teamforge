import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { CreateWorkspaceDialog } from "#/components/create-workspace-dialog";
import { Button } from "#/components/ui/button";
import { getUser, logout } from "#/lib/auth/functions";
import { listWorkspaces } from "#/lib/workspace/functions";

export const Route = createFileRoute("/workspaces")({
	beforeLoad: async () => {
		const user = await getUser();
		if (!user) {
			throw redirect({ to: "/login" });
		}
		return { user };
	},
	loader: async () => {
		const workspaces = await listWorkspaces();
		return { workspaces };
	},
	component: WorkspacesPage,
});

function WorkspacesPage() {
	const { user } = Route.useRouteContext();
	const { workspaces } = Route.useLoaderData();

	async function handleLogout() {
		await logout();
		window.location.href = "/";
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Signed in as {user.email}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<CreateWorkspaceDialog>
						<Button>
							<Plus />
							New workspace
						</Button>
					</CreateWorkspaceDialog>
					<Button variant="outline" onClick={handleLogout}>
						Sign out
					</Button>
				</div>
			</div>

			{workspaces.length === 0 ? (
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
			) : (
				<div className="mt-8 space-y-2">
					{workspaces.map((workspace) => (
						<Link
							key={workspace.id}
							to="/w/$slug"
							params={{ slug: workspace.slug }}
							className="flex items-center justify-between rounded-lg border border-border p-4 no-underline transition hover:bg-accent"
						>
							<div>
								<h2 className="font-semibold text-foreground">
									{workspace.name}
								</h2>
								<p className="mt-0.5 text-sm text-muted-foreground">
									/w/{workspace.slug}
								</p>
							</div>
							<span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
								{workspace.role}
							</span>
						</Link>
					))}
				</div>
			)}
		</main>
	);
}
