import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import {
	ChevronsUpDown,
	Home,
	Layers,
	LogOut,
	Settings,
	Users,
} from "lucide-react";
import ThemeToggle from "#/components/theme-toggle";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import UserAvatar from "#/components/user-avatar";
import { getUser, getUserProfile, logout } from "#/lib/auth/functions";
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
		const [workspace, profile] = await Promise.all([
			getWorkspaceBySlug({ data: { slug: params.slug } }),
			getUserProfile(),
		]);
		if (!workspace) {
			throw redirect({ to: "/workspaces" });
		}
		return { workspace, profile };
	},
	component: WorkspaceLayout,
});

const navItems = [
	{ label: "Dashboard", icon: Home, to: ".", segment: "" },
	{ label: "Projects", icon: Layers, to: "./projects", segment: "projects" },
	{ label: "Members", icon: Users, to: "./members", segment: "members" },
	{ label: "Settings", icon: Settings, to: "./settings", segment: "settings" },
];

function WorkspaceLayout() {
	const { workspace, profile } = Route.useLoaderData();
	const location = useLocation();

	async function handleLogout() {
		await logout();
		window.location.href = "/";
	}

	return (
		<SidebarProvider>
			<Sidebar>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<Link to="/workspaces" className="no-underline">
								<SidebarMenuButton size="lg">
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										{workspace.name.charAt(0).toUpperCase()}
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{workspace.name}
										</span>
										<span className="truncate text-xs text-sidebar-foreground/60">
											All workspaces
										</span>
									</div>
									<ChevronsUpDown className="ml-auto" />
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigation</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{navItems.map((item) => {
									const basePath = `/w/${workspace.slug}`;
									const isActive =
										item.segment === ""
											? location.pathname === basePath ||
												location.pathname === `${basePath}/`
											: location.pathname.startsWith(
													`${basePath}/${item.segment}`,
												);

									return (
										<SidebarMenuItem key={item.label}>
											<Link
												to={item.to}
												from="/w/$slug"
												className="no-underline"
											>
												<SidebarMenuButton
													isActive={isActive}
													tooltip={item.label}
												>
													<item.icon />
													<span>{item.label}</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton size="lg">
										{profile ? (
											<UserAvatar
												displayName={profile.displayName}
												avatarUrl={profile.avatarUrl}
											/>
										) : null}
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">
												{profile?.displayName}
											</span>
											<span className="truncate text-xs text-sidebar-foreground/60">
												{profile?.email}
											</span>
										</div>
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									side="top"
									align="start"
									className="w-(--radix-dropdown-menu-trigger-width)"
								>
									<DropdownMenuLabel className="font-normal">
										<div className="flex flex-col gap-1">
											<p className="text-sm font-medium leading-none">
												{profile?.displayName}
											</p>
											<p className="text-xs leading-none text-muted-foreground">
												{profile?.email}
											</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={handleLogout}>
										<LogOut />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>

				<SidebarRail />
			</Sidebar>

			<SidebarInset>
				<header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<ThemeToggle />
						{profile ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="relative size-8 rounded-full"
									>
										<UserAvatar
											displayName={profile.displayName}
											avatarUrl={profile.avatarUrl}
										/>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel className="font-normal">
										<div className="flex flex-col gap-1">
											<p className="text-sm font-medium leading-none">
												{profile.displayName}
											</p>
											<p className="text-xs leading-none text-muted-foreground">
												{profile.email}
											</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={handleLogout}>
										<LogOut />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
					</div>
				</header>
				<div className="flex-1 overflow-y-auto">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
