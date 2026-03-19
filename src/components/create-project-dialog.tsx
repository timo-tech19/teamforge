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
	type CreateProjectInput,
	createProject,
	createProjectSchema,
} from "#/lib/project/functions";

export function CreateProjectDialog({
	children,
	workspaceId,
}: {
	children: React.ReactNode;
	workspaceId: string;
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
		const raw: CreateProjectInput = {
			workspaceId,
			name: formData.get("name") as string,
			description: (formData.get("description") as string) || undefined,
		};

		const result = createProjectSchema.safeParse(raw);
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

		const response = await createProject({ data: result.data });

		if (response.error || !response.projectId) {
			setErrors({ form: response.error ?? "Something went wrong" });
			setLoading(false);
			return;
		}

		setOpen(false);
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
					<DialogTitle>Create project</DialogTitle>
					<DialogDescription>
						Projects organize tasks and team members within a workspace.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{errors.form && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
							{errors.form}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="project-name">Project name</Label>
						<Input
							id="project-name"
							name="name"
							placeholder="Website Redesign"
							autoComplete="off"
							aria-invalid={!!errors.name}
						/>
						{errors.name && (
							<p className="text-sm text-destructive-foreground">
								{errors.name}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="project-description">
							Description{" "}
							<span className="text-muted-foreground">(optional)</span>
						</Label>
						<Textarea
							id="project-description"
							name="description"
							placeholder="What is this project about?"
							rows={3}
							aria-invalid={!!errors.description}
						/>
						{errors.description && (
							<p className="text-sm text-destructive-foreground">
								{errors.description}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="submit" disabled={loading}>
							{loading && <Spinner />}
							{loading ? "Creating..." : "Create project"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
