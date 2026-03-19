import {
	createFileRoute,
	getRouteApi,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { CreateTaskDialog } from "#/components/create-task-dialog";
import { KanbanBoard, type Task } from "#/components/kanban-board";
import { TaskDetailSheet } from "#/components/task-detail-sheet";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import {
	deleteProject,
	getProjectById,
	updateProject,
} from "#/lib/project/functions";
import { listTasksByProject } from "#/lib/task/functions";

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
		const tasks = await listTasksByProject({
			data: { projectId: params.projectId },
		});
		return { project, tasks };
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
	const { user } = Route.useRouteContext();
	const { project, tasks } = Route.useLoaderData();
	const navigate = useNavigate();

	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [taskSheetOpen, setTaskSheetOpen] = useState(false);

	// Project settings state
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
	const canDeleteTasks = isLead || isWsAdmin;

	function handleTaskClick(task: Task) {
		setSelectedTask(task);
		setTaskSheetOpen(true);
	}

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
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-6 py-4">
				<div className="flex items-center gap-3">
					<h1 className="text-lg font-bold text-foreground">{project.name}</h1>
					<Badge variant={statusVariant[project.status] ?? "outline"}>
						{project.status}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<CreateTaskDialog projectId={project.id}>
						<Button size="sm">
							<Plus />
							Add task
						</Button>
					</CreateTaskDialog>
					{canEdit && (
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="outline" size="icon-sm">
									<Settings className="size-4" />
								</Button>
							</SheetTrigger>
							<SheetContent className="overflow-y-auto sm:max-w-lg">
								<SheetHeader>
									<SheetTitle>Project settings</SheetTitle>
									<SheetDescription>
										Update project details or delete this project.
									</SheetDescription>
								</SheetHeader>
								<div className="space-y-6 px-4 pb-4">
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
												<span className="text-sm text-muted-foreground">
													Saved!
												</span>
											)}
										</div>
									</form>

									{canDelete && (
										<Card className="border-destructive/30">
											<CardHeader>
												<CardTitle className="text-destructive-foreground">
													Danger zone
												</CardTitle>
												<CardDescription>
													Permanently delete this project and all its data.
												</CardDescription>
											</CardHeader>
											<CardContent>
												{!confirmDelete ? (
													<Button
														variant="destructive"
														size="sm"
														onClick={() => setConfirmDelete(true)}
													>
														<Trash2 className="size-3.5" />
														Delete project
													</Button>
												) : (
													<div className="flex items-center gap-2">
														<Button
															variant="destructive"
															size="sm"
															onClick={handleDelete}
															disabled={deleting}
														>
															{deleting && <Spinner />}
															{deleting
																? "Deleting..."
																: "Yes, delete permanently"}
														</Button>
														<Button
															variant="outline"
															size="sm"
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
							</SheetContent>
						</Sheet>
					)}
				</div>
			</div>

			{/* Kanban board */}
			<div className="flex-1 overflow-x-auto p-6">
				<KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} />
			</div>

			{/* Task detail sheet */}
			<TaskDetailSheet
				task={selectedTask}
				open={taskSheetOpen}
				onOpenChange={setTaskSheetOpen}
				canDelete={canDeleteTasks}
				currentUserId={user.id}
				canModerateComments={canDeleteTasks}
			/>
		</div>
	);
}
