import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { deleteWorkspace, updateWorkspace } from "#/lib/workspace/functions";

export const Route = createFileRoute("/w/$slug/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { workspace } = Route.useRouteContext() as {
		workspace: { id: string; name: string; slug: string; role: string };
	};
	const navigate = useNavigate();
	const [name, setName] = useState(workspace.name);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const isOwner = workspace.role === "owner";
	const isAdmin = workspace.role === "admin" || isOwner;

	async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaveError(null);
		setSaveSuccess(false);
		setSaving(true);

		const result = await updateWorkspace({
			data: { id: workspace.id, name },
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
		const result = await deleteWorkspace({ data: { id: workspace.id } });

		if (result.error) {
			setSaveError(result.error);
			setDeleting(false);
			return;
		}

		navigate({ to: "/workspaces" });
	}

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="text-xl font-bold text-foreground">Settings</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Manage your workspace settings.
			</p>

			{/* General settings */}
			<Card className="mt-8">
				<CardHeader>
					<CardTitle>General</CardTitle>
					<CardDescription>
						Update your workspace name and details.
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
							<Label htmlFor="ws-name">Workspace name</Label>
							<Input
								id="ws-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={!isAdmin}
							/>
						</div>

						<div className="space-y-2">
							<Label>URL slug</Label>
							<Input value={workspace.slug} disabled />
							<p className="text-xs text-muted-foreground">
								Slugs cannot be changed after creation.
							</p>
						</div>

						{isAdmin && (
							<div className="flex items-center gap-2">
								<Button
									type="submit"
									disabled={saving || name === workspace.name}
								>
									{saving && <Spinner />}
									{saving ? "Saving..." : "Save changes"}
								</Button>
								{saveSuccess && (
									<span className="text-sm text-muted-foreground">Saved!</span>
								)}
							</div>
						)}
					</form>
				</CardContent>
			</Card>

			{/* Danger zone */}
			{isOwner && (
				<Card className="mt-6 border-destructive/30">
					<CardHeader>
						<CardTitle className="text-destructive-foreground">
							Danger zone
						</CardTitle>
						<CardDescription>
							Permanently delete this workspace and all its projects, tasks, and
							data. This action cannot be undone.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!confirmDelete ? (
							<Button
								variant="destructive"
								onClick={() => setConfirmDelete(true)}
							>
								Delete workspace
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
