import { useNavigate } from "@tanstack/react-router";
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
import {
	type CreateWorkspaceInput,
	createWorkspace,
	createWorkspaceSchema,
} from "#/lib/workspace/functions";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

export function CreateWorkspaceDialog({
	children,
}: {
	children: React.ReactNode;
}) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [slugEdited, setSlugEdited] = useState(false);
	const [slug, setSlug] = useState("");

	function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!slugEdited) {
			setSlug(slugify(e.target.value));
		}
	}

	function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
		setSlugEdited(true);
		setSlug(e.target.value);
	}

	async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setErrors({});
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const raw: CreateWorkspaceInput = {
			name: formData.get("name") as string,
			slug: formData.get("slug") as string,
		};

		const result = createWorkspaceSchema.safeParse(raw);
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

		const response = await createWorkspace({ data: result.data });

		if (response.error) {
			setErrors({ form: response.error });
			setLoading(false);
			return;
		}

		setOpen(false);
		navigate({ to: "/w/$slug", params: { slug: response.slug! } });
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setErrors({});
			setSlug("");
			setSlugEdited(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create workspace</DialogTitle>
					<DialogDescription>
						A workspace is where your team organizes projects and tasks.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{errors.form && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
							{errors.form}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="ws-name">Workspace name</Label>
						<Input
							id="ws-name"
							name="name"
							placeholder="Acme Corp"
							autoComplete="off"
							onChange={handleNameChange}
							aria-invalid={!!errors.name}
						/>
						{errors.name && (
							<p className="text-sm text-destructive-foreground">
								{errors.name}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="ws-slug">URL slug</Label>
						<div className="flex items-center gap-0">
							<span className="flex h-9 shrink-0 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
								/w/
							</span>
							<Input
								id="ws-slug"
								name="slug"
								placeholder="acme-corp"
								autoComplete="off"
								value={slug}
								onChange={handleSlugChange}
								className="rounded-l-none"
								aria-invalid={!!errors.slug}
							/>
						</div>
						{errors.slug && (
							<p className="text-sm text-destructive-foreground">
								{errors.slug}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="submit" disabled={loading}>
							{loading && <Spinner />}
							{loading ? "Creating..." : "Create workspace"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
