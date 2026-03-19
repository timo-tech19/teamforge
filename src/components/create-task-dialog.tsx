import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import {
	type CreateTaskInput,
	createTask,
	createTaskSchema,
} from "#/lib/task/functions";

export function CreateTaskDialog({
	children,
	projectId,
}: {
	children: React.ReactNode;
	projectId: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setErrors({});
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const raw: CreateTaskInput = {
			projectId,
			title: formData.get("title") as string,
			description: (formData.get("description") as string) || undefined,
			priority:
				(formData.get("priority") as CreateTaskInput["priority"]) || undefined,
		};

		const result = createTaskSchema.safeParse(raw);
		if (!result.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const field = issue.path[0] as string;
				fieldErrors[field] = issue.message;
			}
			setErrors(fieldErrors);
			setLoading(false);
			return;
		}

		const response = await createTask({ data: result.data });

		if (response.error) {
			setErrors({ form: response.error });
			setLoading(false);
			return;
		}

		setOpen(false);
		setLoading(false);
		await router.invalidate();
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setErrors({});
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create task</DialogTitle>
					<DialogDescription>Add a new task to the backlog.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{errors.form && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
							{errors.form}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="task-title">Title</Label>
						<Input
							id="task-title"
							name="title"
							placeholder="What needs to be done?"
							autoComplete="off"
							aria-invalid={!!errors.title}
						/>
						{errors.title && (
							<p className="text-sm text-destructive-foreground">
								{errors.title}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="task-description">
							Description{" "}
							<span className="text-muted-foreground">(optional)</span>
						</Label>
						<Textarea
							id="task-description"
							name="description"
							placeholder="Add details, context, or acceptance criteria..."
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="task-priority">Priority</Label>
						<select
							id="task-priority"
							name="priority"
							defaultValue="medium"
							className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="urgent">Urgent</option>
						</select>
					</div>

					<DialogFooter>
						<Button type="submit" disabled={loading}>
							{loading && <Spinner />}
							{loading ? "Creating..." : "Create task"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
