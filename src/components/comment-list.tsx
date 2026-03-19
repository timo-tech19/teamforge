import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import UserAvatar from "#/components/user-avatar";
import {
	createComment,
	deleteComment,
	updateComment,
} from "#/lib/comment/functions";

type Comment = {
	id: string;
	body: string;
	editedAt: string | null;
	createdAt: string;
	authorId: string;
	authorName: string;
	authorAvatar: string | null;
};

function formatRelativeTime(dateStr: string): string {
	const now = Date.now();
	const date = new Date(dateStr).getTime();
	const diff = now - date;

	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;

	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;

	return new Date(dateStr).toLocaleDateString();
}

function CommentItem({
	comment,
	currentUserId,
	canModerate,
	onCommentChange,
}: {
	comment: Comment;
	currentUserId: string;
	canModerate: boolean;
	onCommentChange: () => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [editBody, setEditBody] = useState(comment.body);
	const [saving, setSaving] = useState(false);
	const editRef = useRef<HTMLTextAreaElement>(null);

	const isAuthor = comment.authorId === currentUserId;
	const canEdit = isAuthor;
	const canDelete = isAuthor || canModerate;

	useEffect(() => {
		if (editing && editRef.current) {
			editRef.current.focus();
			editRef.current.setSelectionRange(
				editRef.current.value.length,
				editRef.current.value.length,
			);
		}
	}, [editing]);

	async function handleSaveEdit() {
		if (!editBody.trim() || editBody === comment.body) {
			setEditing(false);
			setEditBody(comment.body);
			return;
		}

		setSaving(true);
		const result = await updateComment({
			data: { id: comment.id, body: editBody },
		});
		setSaving(false);

		if (!result.error) {
			setEditing(false);
			await onCommentChange();
		}
	}

	async function handleDelete() {
		const result = await deleteComment({ data: { id: comment.id } });
		if (!result.error) {
			await onCommentChange();
		}
	}

	return (
		<div className="flex gap-3">
			<UserAvatar
				displayName={comment.authorName}
				avatarUrl={comment.authorAvatar}
				size="sm"
				className="mt-0.5 shrink-0"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground">
						{comment.authorName}
					</span>
					<span className="text-xs text-muted-foreground">
						{formatRelativeTime(comment.createdAt)}
					</span>
					{comment.editedAt && (
						<span className="text-xs text-muted-foreground">(edited)</span>
					)}
					{(canEdit || canDelete) && !editing && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon-xs"
									className="ml-auto opacity-0 group-hover/comment:opacity-100"
								>
									<MoreHorizontal className="size-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{canEdit && (
									<DropdownMenuItem onClick={() => setEditing(true)}>
										<Edit2 />
										Edit
									</DropdownMenuItem>
								)}
								{canDelete && (
									<DropdownMenuItem onClick={handleDelete}>
										<Trash2 />
										Delete
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
				{editing ? (
					<div className="mt-1 space-y-2">
						<Textarea
							ref={editRef}
							value={editBody}
							onChange={(e) => setEditBody(e.target.value)}
							rows={2}
							onKeyDown={(e) => {
								if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
									handleSaveEdit();
								}
								if (e.key === "Escape") {
									setEditing(false);
									setEditBody(comment.body);
								}
							}}
						/>
						<div className="flex items-center gap-2">
							<Button
								size="xs"
								onClick={handleSaveEdit}
								disabled={saving || !editBody.trim()}
							>
								{saving && <Spinner />}
								Save
							</Button>
							<Button
								size="xs"
								variant="ghost"
								onClick={() => {
									setEditing(false);
									setEditBody(comment.body);
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
						{comment.body}
					</p>
				)}
			</div>
		</div>
	);
}

export function CommentList({
	taskId,
	comments,
	currentUserId,
	canModerate,
	onCommentChange,
}: {
	taskId: string;
	comments: Comment[];
	currentUserId: string;
	canModerate: boolean;
	onCommentChange: () => Promise<void>;
}) {
	const [body, setBody] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit() {
		if (!body.trim()) return;

		setSubmitting(true);
		const result = await createComment({
			data: { taskId, body },
		});
		setSubmitting(false);

		if (!result.error) {
			setBody("");
			await onCommentChange();
		}
	}

	return (
		<div className="space-y-4">
			{comments.length > 0 && (
				<div className="space-y-4">
					{comments.map((comment) => (
						<div key={comment.id} className="group/comment">
							<CommentItem
								comment={comment}
								currentUserId={currentUserId}
								canModerate={canModerate}
								onCommentChange={onCommentChange}
							/>
						</div>
					))}
				</div>
			)}

			<div className="space-y-2">
				<Textarea
					placeholder="Write a comment..."
					value={body}
					onChange={(e) => setBody(e.target.value)}
					rows={2}
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
							handleSubmit();
						}
					}}
				/>
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">
						Ctrl+Enter to submit
					</span>
					<Button
						size="sm"
						onClick={handleSubmit}
						disabled={submitting || !body.trim()}
					>
						{submitting && <Spinner />}
						{submitting ? "Posting..." : "Comment"}
					</Button>
				</div>
			</div>
		</div>
	);
}
