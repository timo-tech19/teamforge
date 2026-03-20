import { useRouter } from "@tanstack/react-router";
import {
	Calendar,
	Flag,
	MessageSquare,
	Paperclip,
	Trash2,
	UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AttachmentList } from "#/components/attachment-list";
import { CommentList } from "#/components/comment-list";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import { listAttachmentsByTask } from "#/lib/attachment/functions";
import { listCommentsByTask } from "#/lib/comment/functions";
import { deleteTask, updateTask } from "#/lib/task/functions";

type Task = {
	id: string;
	title: string;
	description: string | null;
	status: string;
	priority: string;
	dueDate: string | null;
	assignedTo: string | null;
};

type Comment = {
	id: string;
	body: string;
	editedAt: string | null;
	createdAt: string;
	authorId: string;
	authorName: string;
	authorAvatar: string | null;
};

const priorityColors: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	low: "secondary",
	medium: "outline",
	high: "default",
	urgent: "destructive",
};

const statusLabels: Record<string, string> = {
	backlog: "Backlog",
	todo: "To Do",
	in_progress: "In Progress",
	in_review: "In Review",
	done: "Done",
};

type ProjectMember = {
	userId: string;
	displayName: string;
	avatarUrl: string | null;
};

export function TaskDetailSheet({
	task,
	projectId,
	open,
	onOpenChange,
	canDelete,
	currentUserId,
	canModerateComments,
	projectMembers,
}: {
	task: Task | null;
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canDelete: boolean;
	currentUserId: string;
	canModerateComments: boolean;
	projectMembers: ProjectMember[];
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [comments, setComments] = useState<Comment[]>([]);
	const [attachments, setAttachments] = useState<
		Awaited<ReturnType<typeof listAttachmentsByTask>>
	>([]);
	const [loadingData, setLoadingData] = useState(false);

	// Fetch comments and attachments when task changes or sheet opens
	useEffect(() => {
		if (!task || !open) {
			setComments([]);
			setAttachments([]);
			return;
		}

		let cancelled = false;
		setLoadingData(true);

		Promise.all([
			listCommentsByTask({ data: { taskId: task.id } }),
			listAttachmentsByTask({ data: { taskId: task.id } }),
		])
			.then(([commentsResult, attachmentsResult]) => {
				if (!cancelled) {
					setComments(commentsResult);
					setAttachments(attachmentsResult);
					setLoadingData(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setLoadingData(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [task, open]);

	if (!task) return null;

	const taskId = task.id;

	async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaving(true);

		const formData = new FormData(e.currentTarget);
		const result = await updateTask({
			data: {
				id: taskId,
				title: formData.get("title") as string,
				description: (formData.get("description") as string) || null,
				status: formData.get("status") as
					| "backlog"
					| "todo"
					| "in_progress"
					| "in_review"
					| "done",
				priority: formData.get("priority") as
					| "low"
					| "medium"
					| "high"
					| "urgent",
				dueDate: (formData.get("dueDate") as string) || null,
				assignedTo: (formData.get("assignedTo") as string) || null,
			},
		});

		setSaving(false);

		if (!result.error) {
			onOpenChange(false);
			await router.invalidate();
		}
	}

	async function handleDelete() {
		setDeleting(true);
		const result = await deleteTask({ data: { id: taskId } });
		setDeleting(false);

		if (!result.error) {
			onOpenChange(false);
			setConfirmDelete(false);
			await router.invalidate();
		}
	}

	async function refreshComments() {
		const result = await listCommentsByTask({ data: { taskId } });
		setComments(result);
	}

	async function refreshAttachments() {
		const result = await listAttachmentsByTask({ data: { taskId } });
		setAttachments(result);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				key={task.id + task.status + task.priority}
				className="overflow-y-auto sm:max-w-lg"
			>
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Badge variant={priorityColors[task.priority] ?? "outline"}>
							<Flag className="size-3" />
							{task.priority}
						</Badge>
						<Badge variant="outline">{statusLabels[task.status]}</Badge>
					</SheetTitle>
					<SheetDescription className="sr-only">
						Edit task details
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSave} className="space-y-4 px-4 pb-4">
					<div className="space-y-2">
						<Label htmlFor="edit-title">Title</Label>
						<Input id="edit-title" name="title" defaultValue={task.title} />
					</div>

					<div className="space-y-2">
						<Label htmlFor="edit-description">Description</Label>
						<Textarea
							id="edit-description"
							name="description"
							defaultValue={task.description ?? ""}
							rows={4}
							placeholder="Add details..."
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="edit-status">Status</Label>
							<select
								id="edit-status"
								name="status"
								defaultValue={task.status}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
							>
								<option value="backlog">Backlog</option>
								<option value="todo">To Do</option>
								<option value="in_progress">In Progress</option>
								<option value="in_review">In Review</option>
								<option value="done">Done</option>
							</select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-priority">Priority</Label>
							<select
								id="edit-priority"
								name="priority"
								defaultValue={task.priority}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="urgent">Urgent</option>
							</select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="edit-due-date">
							<Calendar className="mr-1 inline size-3.5" />
							Due date
						</Label>
						<Input
							id="edit-due-date"
							name="dueDate"
							type="date"
							defaultValue={task.dueDate ?? ""}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="edit-assigned-to">
							<UserCircle className="mr-1 inline size-3.5" />
							Assignee
						</Label>
						<select
							id="edit-assigned-to"
							name="assignedTo"
							defaultValue={task.assignedTo ?? ""}
							className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<option value="">Unassigned</option>
							{projectMembers.map((member) => (
								<option key={member.userId} value={member.userId}>
									{member.displayName}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2 pt-2">
						<Button type="submit" disabled={saving}>
							{saving && <Spinner />}
							{saving ? "Saving..." : "Save changes"}
						</Button>
					</div>
				</form>

				{/* Attachments section */}
				<div className="px-4 pb-4">
					<Separator className="mb-4" />
					<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
						<Paperclip className="size-4" />
						Attachments
						{attachments.length > 0 && (
							<span className="text-xs text-muted-foreground">
								({attachments.length})
							</span>
						)}
					</h3>
					{loadingData ? (
						<div className="flex items-center justify-center py-4">
							<Spinner />
						</div>
					) : (
						<AttachmentList
							taskId={taskId}
							projectId={projectId}
							attachments={attachments}
							canUpload={true}
							canDelete={canDelete}
							onAttachmentChange={refreshAttachments}
						/>
					)}
				</div>

				{/* Comments section */}
				<div className="px-4 pb-4">
					<Separator className="mb-4" />
					<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
						<MessageSquare className="size-4" />
						Comments
						{comments.length > 0 && (
							<span className="text-xs text-muted-foreground">
								({comments.length})
							</span>
						)}
					</h3>
					{loadingData ? (
						<div className="flex items-center justify-center py-4">
							<Spinner />
						</div>
					) : (
						<CommentList
							taskId={taskId}
							comments={comments}
							currentUserId={currentUserId}
							canModerate={canModerateComments}
							onCommentChange={refreshComments}
						/>
					)}
				</div>

				{canDelete && (
					<div className="border-t border-border px-4 py-4">
						{!confirmDelete ? (
							<Button
								variant="ghost"
								size="sm"
								className="text-destructive-foreground"
								onClick={() => setConfirmDelete(true)}
							>
								<Trash2 className="size-3.5" />
								Delete task
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
									{deleting ? "Deleting..." : "Confirm delete"}
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
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
