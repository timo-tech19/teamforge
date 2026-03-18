import { createFileRoute } from "@tanstack/react-router";
import { getUser, logout } from "#/lib/auth/functions";

export const Route = createFileRoute("/workspaces")({
	beforeLoad: async () => {
		const user = await getUser();
		if (!user) {
			throw new Error("Not authenticated");
		}
		return { user };
	},
	errorComponent: () => {
		return (
			<main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-foreground">Access denied</h1>
					<p className="mt-2 text-muted-foreground">
						You need to{" "}
						<a href="/login" className="font-medium underline">
							sign in
						</a>{" "}
						to view this page.
					</p>
				</div>
			</main>
		);
	},
	component: WorkspacesPage,
});

function WorkspacesPage() {
	const { user } = Route.useRouteContext();

	async function handleLogout() {
		await logout();
		window.location.href = "/login";
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
				<button
					type="button"
					onClick={handleLogout}
					className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
				>
					Sign out
				</button>
			</div>
			<div className="mt-8 rounded-lg border border-border p-8 text-center text-muted-foreground">
				No workspaces yet. We'll build this next.
			</div>
		</main>
	);
}
