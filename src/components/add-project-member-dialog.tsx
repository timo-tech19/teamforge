import { useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Spinner } from "#/components/ui/spinner";
import UserAvatar from "#/components/user-avatar";
import {
	addProjectMember,
	listAvailableMembers,
} from "#/lib/project-member/functions";

type AvailableMember = {
	userId: string;
	displayName: string;
	avatarUrl: string | null;
};

export function AddProjectMemberDialog({
	children,
	projectId,
	workspaceId,
}: {
	children: React.ReactNode;
	projectId: string;
	workspaceId: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [available, setAvailable] = useState<AvailableMember[]>([]);
	const [loading, setLoading] = useState(false);
	const [adding, setAdding] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		setLoading(true);
		setError(null);

		listAvailableMembers({ data: { projectId, workspaceId } })
			.then((result) => {
				if (!cancelled) {
					setAvailable(result);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [open, projectId, workspaceId]);

	async function handleAdd(userId: string, role: string) {
		setAdding(userId);
		setError(null);

		const result = await addProjectMember({
			data: {
				projectId,
				userId,
				role: role as "lead" | "member" | "viewer",
			},
		});

		setAdding(null);

		if (result.error) {
			setError(result.error);
			return;
		}

		// Remove from available list
		setAvailable((prev) => prev.filter((m) => m.userId !== userId));
		await router.invalidate();
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add project member</DialogTitle>
					<DialogDescription>
						Add workspace members to this project.
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
						{error}
					</div>
				)}

				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Spinner />
					</div>
				) : available.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						All workspace members are already in this project.
					</p>
				) : (
					<div className="max-h-80 space-y-1 overflow-y-auto">
						{available.map((member) => (
							<div
								key={member.userId}
								className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
							>
								<UserAvatar
									displayName={member.displayName}
									avatarUrl={member.avatarUrl}
									size="sm"
								/>
								<span className="flex-1 text-sm font-medium text-foreground">
									{member.displayName}
								</span>
								<Button
									size="xs"
									variant="outline"
									onClick={() => handleAdd(member.userId, "member")}
									disabled={adding !== null}
								>
									{adding === member.userId ? (
										<Spinner />
									) : (
										<Plus className="size-3" />
									)}
									Add
								</Button>
							</div>
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
