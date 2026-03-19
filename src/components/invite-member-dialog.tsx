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
import {
	type InviteMemberInput,
	inviteMember,
	inviteMemberSchema,
} from "#/lib/member/functions";

export function InviteMemberDialog({
	children,
	workspaceId,
	isOwner,
}: {
	children: React.ReactNode;
	workspaceId: string;
	isOwner: boolean;
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
		const raw: InviteMemberInput = {
			workspaceId,
			email: formData.get("email") as string,
			role: (formData.get("role") as InviteMemberInput["role"]) || undefined,
		};

		const result = inviteMemberSchema.safeParse(raw);
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

		const response = await inviteMember({ data: result.data });

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
					<DialogTitle>Invite member</DialogTitle>
					<DialogDescription>
						Invite someone to this workspace by email. They must already have a
						TeamForge account.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{errors.form && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
							{errors.form}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="invite-email">Email address</Label>
						<Input
							id="invite-email"
							name="email"
							type="email"
							placeholder="colleague@example.com"
							autoComplete="off"
							aria-invalid={!!errors.email}
						/>
						{errors.email && (
							<p className="text-sm text-destructive-foreground">
								{errors.email}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="invite-role">Role</Label>
						<select
							id="invite-role"
							name="role"
							defaultValue="member"
							className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<option value="viewer">Viewer</option>
							<option value="member">Member</option>
							{isOwner && <option value="admin">Admin</option>}
						</select>
					</div>

					<DialogFooter>
						<Button type="submit" disabled={loading}>
							{loading && <Spinner />}
							{loading ? "Inviting..." : "Send invite"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
