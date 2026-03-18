import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { getUser, logout } from "#/lib/auth/functions";

export const Route = createFileRoute("/workspaces")({
	beforeLoad: async () => {
		const user = await getUser();
		if (!user) {
			throw redirect({ to: "/login" });
		}
		return { user };
	},
	component: WorkspacesPage,
});

function WorkspacesPage() {
	const { user } = Route.useRouteContext();

	async function handleLogout() {
		await logout();
		window.location.href = "/";
	}

	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Signed in as {user.email}
					</p>
				</div>
				<Button variant="outline" onClick={handleLogout}>
					Sign out
				</Button>
			</div>
			<div className="mt-8 rounded-lg border border-border p-8 text-center text-muted-foreground">
				No workspaces yet. We'll build this next.
			</div>
		</main>
	);
}
