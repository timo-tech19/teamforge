import {
	createFileRoute,
	getRouteApi,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { LogOut, Plus, Settings, Shield, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { AddProjectMemberDialog } from "#/components/add-project-member-dialog";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
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
import UserAvatar from "#/components/user-avatar";
import {
	deleteProject,
	getProjectById,
	updateProject,
} from "#/lib/project/functions";
import {
	listProjectMembers,
	removeProjectMember,
	updateProjectMemberRole,
} from "#/lib/project-member/functions";
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
		const [tasks, projectMembers] = await Promise.all([
			listTasksByProject({ data: { projectId: params.projectId } }),
			listProjectMembers({ data: { projectId: params.projectId } }),
		]);
		return { project, tasks, projectMembers };
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
	const { project, tasks, projectMembers } = Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();

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
	const isProjectViewer = project.role === "viewer";
	const wsRole = workspace.role;
	const isWsAdmin = wsRole === "owner" || wsRole === "admin";
	const canEdit = isLead || isWsAdmin;
	const canDelete = isWsAdmin;
	const canCreateTasks = !isProjectViewer || isWsAdmin;
	const canDeleteTasks = isLead || isWsAdmin;
	const canManageMembers = isLead || isWsAdmin;
	const [memberLoading, setMemberLoading] = useState<string | null>(null);

	async function handleMemberRoleChange(userId: string, newRole: string) {
		setMemberLoading(userId);
		await updateProjectMemberRole({
			data: {
				projectId: project.id,
				userId,
				role: newRole as "lead" | "member" | "viewer",
			},
		});
		setMemberLoading(null);
		await router.invalidate();
	}

	async function handleRemoveMember(userId: string) {
		setMemberLoading(userId);
		await removeProjectMember({
			data: { projectId: project.id, userId },
		});
		setMemberLoading(null);
		await router.invalidate();
	}

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
					{canCreateTasks && (
						<CreateTaskDialog projectId={project.id}>
							<Button size="sm">
								<Plus />
								Add task
							</Button>
						</CreateTaskDialog>
					)}
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

									{/* Project members */}
									<div>
										<div className="mb-3 flex items-center justify-between">
											<h3 className="text-sm font-medium text-foreground">
												Members ({projectMembers.length})
											</h3>
											{canManageMembers && (
												<AddProjectMemberDialog
													projectId={project.id}
													workspaceId={project.workspaceId}
												>
													<Button size="xs" variant="outline">
														<UserPlus className="size-3" />
														Add
													</Button>
												</AddProjectMemberDialog>
											)}
										</div>
										<div className="space-y-2">
											{projectMembers.map((member) => {
												const isSelf = member.userId === user.id;
												const isLead = member.role === "lead";
												const canChange = canManageMembers && !isSelf;
												const canRemove =
													(canManageMembers && !isSelf) || (isSelf && !isLead);
												const isLoading = memberLoading === member.userId;

												return (
													<div
														key={member.userId}
														className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
													>
														<UserAvatar
															displayName={member.displayName}
															avatarUrl={member.avatarUrl}
															size="sm"
														/>
														<div className="flex-1">
															<span className="text-sm font-medium text-foreground">
																{member.displayName}
															</span>
															{isSelf && (
																<span className="ml-1 text-xs text-muted-foreground">
																	(you)
																</span>
															)}
															<div className="mt-0.5">
																<Badge
																	variant="outline"
																	className="text-[10px]"
																>
																	<Shield className="size-2.5" />
																	{member.role}
																</Badge>
															</div>
														</div>
														{(canChange || canRemove) && (
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="outline"
																		size="xs"
																		disabled={isLoading}
																	>
																		{isLoading ? <Spinner /> : "Manage"}
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	{canChange && (
																		<>
																			{member.role !== "lead" && (
																				<DropdownMenuItem
																					onClick={() =>
																						handleMemberRoleChange(
																							member.userId,
																							"lead",
																						)
																					}
																				>
																					Make Lead
																				</DropdownMenuItem>
																			)}
																			{member.role !== "member" && (
																				<DropdownMenuItem
																					onClick={() =>
																						handleMemberRoleChange(
																							member.userId,
																							"member",
																						)
																					}
																				>
																					Make Member
																				</DropdownMenuItem>
																			)}
																			{member.role !== "viewer" && (
																				<DropdownMenuItem
																					onClick={() =>
																						handleMemberRoleChange(
																							member.userId,
																							"viewer",
																						)
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
																			onClick={() =>
																				handleRemoveMember(member.userId)
																			}
																			className="text-destructive-foreground"
																		>
																			<LogOut className="size-3.5" />
																			{isSelf ? "Leave project" : "Remove"}
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
				projectId={project.id}
				open={taskSheetOpen}
				onOpenChange={setTaskSheetOpen}
				canDelete={canDeleteTasks}
				currentUserId={user.id}
				canModerateComments={canDeleteTasks}
			/>
		</div>
	);
}
