import {
	createFileRoute,
	getRouteApi,
	Link,
	redirect,
} from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { CreateProjectDialog } from "#/components/create-project-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { listProjects } from "#/lib/project/functions";
import { getWorkspaceBySlug } from "#/lib/workspace/functions";

export const Route = createFileRoute("/w/$slug/projects/")({
	loader: async ({ params }) => {
		const workspace = await getWorkspaceBySlug({
			data: { slug: params.slug },
		});
		if (!workspace) {
			throw redirect({ to: "/workspaces" });
		}
		const projects = await listProjects({
			data: { workspaceId: workspace.id },
		});
		return { projects };
	},
	component: ProjectListPage,
});

const workspaceRoute = getRouteApi("/w/$slug");

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
	active: "default",
	paused: "secondary",
	archived: "outline",
};

function ProjectListPage() {
	const { workspace } = workspaceRoute.useLoaderData();
	const { projects } = Route.useLoaderData();

	return (
		<div className="p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-bold text-foreground">Projects</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage projects in {workspace.name}
					</p>
				</div>
				<CreateProjectDialog workspaceId={workspace.id}>
					<Button>
						<Plus />
						New project
					</Button>
				</CreateProjectDialog>
			</div>

			{projects.length === 0 ? (
				<div className="mt-16 text-center">
					<h2 className="text-lg font-semibold text-foreground">
						No projects yet
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Create your first project to start organizing work.
					</p>
					<div className="mt-6">
						<CreateProjectDialog workspaceId={workspace.id}>
							<Button>
								<Plus />
								Create project
							</Button>
						</CreateProjectDialog>
					</div>
				</div>
			) : (
				<div className="mt-8 space-y-2">
					{projects.map((project) => (
						<Link
							key={project.id}
							to="/w/$slug/projects/$projectId"
							params={{
								slug: workspace.slug,
								projectId: project.id,
							}}
							className="group flex items-center gap-4 rounded-lg border border-border p-4 no-underline transition hover:bg-accent"
						>
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<h2 className="font-semibold text-foreground">
										{project.name}
									</h2>
									<Badge variant={statusVariant[project.status] ?? "outline"}>
										{project.status}
									</Badge>
								</div>
								{project.description && (
									<p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
										{project.description}
									</p>
								)}
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
