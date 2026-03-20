import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import {
	Activity,
	ChevronsUpDown,
	Folder,
	Home,
	Layers,
	LogOut,
	Plus,
	Settings,
	Users,
} from "lucide-react";
import { CreateProjectDialog } from "#/components/create-project-dialog";
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
import { useWorkspacePresence } from "#/hooks/use-workspace-presence";
import { getUser, getUserProfile, logout } from "#/lib/auth/functions";
import { listProjects } from "#/lib/project/functions";
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
		const projects = await listProjects({
			data: { workspaceId: workspace.id },
		});
		return { workspace, profile, projects };
	},
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	const { user } = Route.useRouteContext();
	const { workspace, profile, projects } = Route.useLoaderData();

	const isAdmin = workspace.role === "owner" || workspace.role === "admin";

	const { onlineUsers } = useWorkspacePresence({
		workspaceId: workspace.id,
		currentUserId: user.id,
		displayName: profile?.displayName ?? "User",
		avatarUrl: profile?.avatarUrl ?? null,
	});

	const navItems = [
		{ label: "Dashboard", icon: Home, to: ".", segment: "" },
		{
			label: "Activity",
			icon: Activity,
			to: "./activity",
			segment: "activity",
		},
		{ label: "Projects", icon: Layers, to: "./projects", segment: "projects" },
		{ label: "Members", icon: Users, to: "./members", segment: "members" },
		...(isAdmin
			? [
					{
						label: "Settings",
						icon: Settings,
						to: "./settings",
						segment: "settings",
					},
				]
			: []),
	];
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

					<SidebarGroup>
						<SidebarGroupLabel>Projects</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{projects.map((project) => {
									const isActive = location.pathname.includes(
										`/w/${workspace.slug}/projects/${project.id}`,
									);

									return (
										<SidebarMenuItem key={project.id}>
											<Link
												to="/w/$slug/projects/$projectId"
												params={{
													slug: workspace.slug,
													projectId: project.id,
												}}
												className="no-underline"
											>
												<SidebarMenuButton
													isActive={isActive}
													tooltip={project.name}
												>
													<Folder />
													<span>{project.name}</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>
									);
								})}
								<SidebarMenuItem>
									<CreateProjectDialog workspaceId={workspace.id}>
										<SidebarMenuButton className="text-sidebar-foreground/60">
											<Plus />
											<span>New project</span>
										</SidebarMenuButton>
									</CreateProjectDialog>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>

					{onlineUsers.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>
								Online ({onlineUsers.length})
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{onlineUsers.map((u) => (
										<SidebarMenuItem key={u.userId}>
											<SidebarMenuButton className="pointer-events-none">
												<div className="relative">
													<UserAvatar
														displayName={u.displayName}
														avatarUrl={u.avatarUrl}
														size="sm"
													/>
													<span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
												</div>
												<span>{u.displayName}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}
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
