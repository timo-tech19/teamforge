import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { Home, Layers, LogOut, Settings, Users } from "lucide-react";
import ThemeToggle from "#/components/theme-toggle";
import { Button } from "#/components/ui/button";
import { getUser, logout } from "#/lib/auth/functions";
import { getWorkspaceBySlug } from "#/lib/workspace/functions";

export const Route = createFileRoute("/w/$slug")({
	beforeLoad: async () => {
		const user = await getUser();
		if (!user) {
			throw redirect({ to: "/login" });
		}
		return { user };
	},
	loader: async ({ params }) => {
		const workspace = await getWorkspaceBySlug({
			data: { slug: params.slug },
		});
		if (!workspace) {
			throw redirect({ to: "/workspaces" });
		}
		return { workspace };
	},
	component: WorkspaceLayout,
});

const navItems = [
	{ label: "Dashboard", icon: Home, to: "." },
	{ label: "Projects", icon: Layers, to: "./projects" },
	{ label: "Members", icon: Users, to: "./members" },
	{ label: "Settings", icon: Settings, to: "./settings" },
];

function WorkspaceLayout() {
	const { workspace } = Route.useLoaderData();
	const { user } = Route.useRouteContext();

	async function handleLogout() {
		await logout();
		window.location.href = "/";
	}

	return (
		<div className="flex h-[calc(100vh-3.5rem)]">
			{/* Sidebar */}
			<aside className="flex w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
				{/* Workspace name */}
				<div className="border-b border-sidebar-border px-4 py-3">
					<Link
						to="/workspaces"
						className="text-xs font-medium text-sidebar-foreground/60 no-underline hover:text-sidebar-foreground"
					>
						← All workspaces
					</Link>
					<h2 className="mt-1 truncate text-sm font-semibold">
						{workspace.name}
					</h2>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1 px-2 py-3">
					{navItems.map((item) => (
						<Link
							key={item.label}
							to={item.to}
							from="/w/$slug"
							className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 no-underline transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							activeProps={{
								className:
									"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground no-underline",
							}}
							activeOptions={{ exact: item.to === "." }}
						>
							<item.icon className="size-4" />
							{item.label}
						</Link>
					))}
				</nav>

				{/* Footer */}
				<div className="border-t border-sidebar-border px-3 py-3">
					<div className="flex items-center justify-between">
						<p className="truncate text-xs text-sidebar-foreground/60">
							{user.email}
						</p>
						<div className="flex items-center gap-1">
							<ThemeToggle />
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={handleLogout}
								title="Sign out"
							>
								<LogOut className="size-3.5" />
							</Button>
						</div>
					</div>
				</div>
			</aside>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto">
				<Outlet />
			</main>
		</div>
	);
}
