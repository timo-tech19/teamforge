import {
	createFileRoute,
	getRouteApi,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import {
	deleteProject,
	getProjectById,
	updateProject,
} from "#/lib/project/functions";

export const Route = createFileRoute("/w/$slug/projects/$projectId")({
	loader: async ({ params }) => {
		const project = await getProjectById({
			data: { projectId: params.projectId },
		});
		if (!project) {
			throw redirect({
				to: "/w/$slug/projects",
				params: { slug: params.slug },
			});
		}
		return { project };
	},
	component: ProjectDetailPage,
});

const workspaceRoute = getRouteApi("/w/$slug");

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
	active: "default",
	paused: "secondary",
	archived: "outline",
};

function ProjectDetailPage() {
	const { workspace } = workspaceRoute.useLoaderData();
	const { project } = Route.useLoaderData();
	const navigate = useNavigate();

	const [name, setName] = useState(project.name);
	const [description, setDescription] = useState(project.description ?? "");
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const isLead = project.role === "lead";
	const wsRole = workspace.role;
	const isWsAdmin = wsRole === "owner" || wsRole === "admin";
	const canEdit = isLead || isWsAdmin;
	const canDelete = isWsAdmin;

	async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaveError(null);
		setSaveSuccess(false);
		setSaving(true);

		const result = await updateProject({
			data: {
				id: project.id,
				name,
				description: description || undefined,
			},
		});

		if (result.error) {
			setSaveError(result.error);
		} else {
			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 2000);
		}
		setSaving(false);
	}

	async function handleDelete() {
		setDeleting(true);
		const result = await deleteProject({ data: { id: project.id } });

		if (result.error) {
			setSaveError(result.error);
			setDeleting(false);
			return;
		}

		navigate({
			to: "/w/$slug/projects",
			params: { slug: workspace.slug },
		});
	}

	return (
		<div className="mx-auto max-w-2xl p-6">
			<div className="flex items-center gap-3">
				<h1 className="text-xl font-bold text-foreground">{project.name}</h1>
				<Badge variant={statusVariant[project.status] ?? "outline"}>
					{project.status}
				</Badge>
			</div>
			{project.description && (
				<p className="mt-2 text-sm text-muted-foreground">
					{project.description}
				</p>
			)}

			{/* Tasks placeholder */}
			<div className="mt-8 rounded-lg border border-border p-8 text-center text-muted-foreground">
				Tasks and activity will appear here.
			</div>

			{/* Project settings */}
			{canEdit && (
				<Card className="mt-8">
					<CardHeader>
						<CardTitle>Project settings</CardTitle>
						<CardDescription>
							Update project name and description.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSave} className="space-y-4">
							{saveError && (
								<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
									{saveError}
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="project-name">Project name</Label>
								<Input
									id="project-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="project-desc">Description</Label>
								<Textarea
									id="project-desc"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={3}
								/>
							</div>

							<div className="flex items-center gap-2">
								<Button
									type="submit"
									disabled={
										saving ||
										(name === project.name &&
											description === (project.description ?? ""))
									}
								>
									{saving && <Spinner />}
									{saving ? "Saving..." : "Save changes"}
								</Button>
								{saveSuccess && (
									<span className="text-sm text-muted-foreground">Saved!</span>
								)}
							</div>
						</form>
					</CardContent>
				</Card>
			)}

			{/* Danger zone */}
			{canDelete && (
				<Card className="mt-6 border-destructive/30">
					<CardHeader>
						<CardTitle className="text-destructive-foreground">
							Danger zone
						</CardTitle>
						<CardDescription>
							Permanently delete this project and all its tasks, comments, and
							data. This action cannot be undone.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!confirmDelete ? (
							<Button
								variant="destructive"
								onClick={() => setConfirmDelete(true)}
							>
								Delete project
							</Button>
						) : (
							<div className="flex items-center gap-2">
								<Button
									variant="destructive"
									onClick={handleDelete}
									disabled={deleting}
								>
									{deleting && <Spinner />}
									{deleting ? "Deleting..." : "Yes, delete permanently"}
								</Button>
								<Button
									variant="outline"
									onClick={() => setConfirmDelete(false)}
								>
									Cancel
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
