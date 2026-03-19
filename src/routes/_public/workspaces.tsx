import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { CreateWorkspaceDialog } from "#/components/create-workspace-dialog";
import { Button } from "#/components/ui/button";
import { getUser } from "#/lib/auth/functions";
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
		const workspaces = await listWorkspaces();
		return { workspaces };
	},
	component: WorkspacesPage,
});

function WorkspacesPage() {
	const { workspaces } = Route.useLoaderData();

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
			)}
		</main>
	);
}
