import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import {
	Calendar,
	CheckCircle2,
	Clock,
	FileText,
	Flag,
	Folder,
	Layers,
	ListTodo,
	Loader2,
	MessageSquare,
	Pencil,
	Trash2,
	UserMinus,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { RouteError } from "#/components/route-error";
import { ListPageSkeleton } from "#/components/route-pending";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import UserAvatar from "#/components/user-avatar";
import {
	listRecentActivity,
	listUpcomingTasks,
} from "#/lib/dashboard/functions";
import { getSupabaseBrowserClient } from "#/lib/supabase/client";
import { formatRelativeTime } from "#/lib/utils";

export const Route = createFileRoute("/w/$slug/")({
	loader: async ({ params }) => {
		// We need the workspace from the parent route, but we can't
		// access it in the loader directly. Instead we import and call.
		const { getWorkspaceBySlug } = await import("#/lib/workspace/functions");
		const workspace = await getWorkspaceBySlug({
			data: { slug: params.slug },
		});
		if (!workspace) return { upcomingTasks: [], recentActivity: [] };

		const [upcomingTasks, recentActivity] = await Promise.all([
			listUpcomingTasks({ data: { workspaceId: workspace.id } }),
			listRecentActivity({ data: { workspaceId: workspace.id } }),
		]);

		return { upcomingTasks, recentActivity };
	},
	component: DashboardPage,
	pendingComponent: ListPageSkeleton,
	errorComponent: ({ error, reset }) => (
		<RouteError error={error} reset={reset} />
	),
});

const workspaceRoute = getRouteApi("/w/$slug");

// ── Stats types ───────────────────────────────────────────────────────

type WorkspaceStats = {
	activeProjects: number;
	myOpenTasks: number;
	tasksDueThisWeek: number;
	totalMembers: number | null;
	isAdmin: boolean;
};

// ── Action config for activity items ──────────────────────────────────

const ACTION_CONFIG: Record<
	string,
	{
		icon: React.ElementType;
		label: (meta: Record<string, string> | null) => string;
	}
> = {
	task_created: {
		icon: FileText,
		label: (meta) => `created task "${meta?.task_title ?? "Untitled"}"`,
	},
	task_updated: {
		icon: Pencil,
		label: (meta) => {
			if (meta?.new_status === "done") {
				return `completed "${meta?.task_title ?? "Untitled"}"`;
			}
			return `updated "${meta?.task_title ?? "Untitled"}"`;
		},
	},
	task_deleted: {
		icon: Trash2,
		label: (meta) => `deleted task "${meta?.task_title ?? "Untitled"}"`,
	},
	comment_added: {
		icon: MessageSquare,
		label: (meta) => `commented on "${meta?.task_title ?? "a task"}"`,
	},
	member_invited: {
		icon: UserPlus,
		label: () => "invited a new member",
	},
	member_removed: {
		icon: UserMinus,
		label: () => "removed a member",
	},
	project_created: {
		icon: Layers,
		label: (meta) => `created project "${meta?.project_name ?? "Untitled"}"`,
	},
	project_archived: {
		icon: CheckCircle2,
		label: (meta) => `archived project "${meta?.project_name ?? "Untitled"}"`,
	},
};

// ── Priority colors ───────────────────────────────────────────────────

const priorityColors: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	low: "secondary",
	medium: "outline",
	high: "default",
	urgent: "destructive",
};

// ── Dashboard page ────────────────────────────────────────────────────

function DashboardPage() {
	const { workspace } = workspaceRoute.useLoaderData();
	const { upcomingTasks, recentActivity } = Route.useLoaderData();

	const [stats, setStats] = useState<WorkspaceStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);

	// Fetch stats from Edge Function (client-side)
	useEffect(() => {
		const supabase = getSupabaseBrowserClient();
		supabase.functions
			.invoke("workspace-stats", {
				body: { workspaceId: workspace.id },
			})
			.then(({ data, error }) => {
				if (!error && data) {
					setStats(data as WorkspaceStats);
				}
				setStatsLoading(false);
			});
	}, [workspace.id]);

	return (
		<div className="p-6">
			<h1 className="text-xl font-bold text-foreground">Dashboard</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Welcome to {workspace.name}
			</p>

			{/* Stats cards */}
			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title={stats?.isAdmin ? "Active Projects" : "My Projects"}
					value={stats?.activeProjects}
					loading={statsLoading}
					icon={Folder}
				/>
				<StatsCard
					title="Open Tasks"
					value={stats?.myOpenTasks}
					loading={statsLoading}
					icon={ListTodo}
				/>
				<StatsCard
					title="Due This Week"
					value={stats?.tasksDueThisWeek}
					loading={statsLoading}
					icon={Calendar}
				/>
				{stats?.totalMembers != null ? (
					<StatsCard
						title="Members"
						value={stats.totalMembers}
						loading={statsLoading}
						icon={Users}
					/>
				) : (
					<StatsCard
						title="Due This Week"
						value={null}
						loading={statsLoading}
						icon={Calendar}
						hidden={!statsLoading && stats?.totalMembers == null}
					/>
				)}
			</div>

			<div className="mt-8 grid gap-6 lg:grid-cols-2">
				{/* Upcoming tasks */}
				<div>
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-foreground">
							Upcoming Tasks
						</h2>
						<Link
							to="/w/$slug/my-tasks"
							params={{ slug: workspace.slug }}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							View all
						</Link>
					</div>
					{upcomingTasks.length === 0 ? (
						<div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
							No upcoming tasks with due dates.
						</div>
					) : (
						<div className="space-y-2">
							{upcomingTasks.map((task) => (
								<Link
									key={task.id}
									to="/w/$slug/projects/$projectId"
									params={{
										slug: workspace.slug,
										projectId: task.projectId,
									}}
									search={{ task: task.id }}
									className="flex items-center gap-3 rounded-md border border-border p-3 no-underline transition hover:border-foreground/20"
								>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-foreground">
											{task.title}
										</p>
										<p className="mt-0.5 text-xs text-muted-foreground">
											{task.projectName}
										</p>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										<Badge
											variant={priorityColors[task.priority] ?? "outline"}
											className="text-[10px]"
										>
											<Flag className="size-2.5" />
											{task.priority}
										</Badge>
										{task.dueDate && (
											<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
												<Clock className="size-2.5" />
												{task.dueDate}
											</span>
										)}
									</div>
								</Link>
							))}
						</div>
					)}
				</div>

				{/* Recent activity */}
				<div>
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-foreground">
							Recent Activity
						</h2>
						<Link
							to="/w/$slug/activity"
							params={{ slug: workspace.slug }}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							View all
						</Link>
					</div>
					{recentActivity.length === 0 ? (
						<div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
							No activity yet.
						</div>
					) : (
						<div className="divide-y divide-border rounded-lg border border-border">
							{recentActivity.map((item) => {
								const config = ACTION_CONFIG[item.action];
								const Icon = config?.icon ?? FileText;
								const label = config?.label(item.metadata) ?? item.action;

								return (
									<div
										key={item.id}
										className="flex items-start gap-3 px-3 py-2.5"
									>
										<UserAvatar
											displayName={item.actorName}
											avatarUrl={item.actorAvatar}
											size="sm"
										/>
										<div className="min-w-0 flex-1">
											<p className="text-xs text-foreground">
												<span className="font-medium">{item.actorName}</span>{" "}
												{label}
											</p>
											<div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
												<Icon className="size-2.5" />
												<span>{formatRelativeTime(item.createdAt)}</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Stats card component ──────────────────────────────────────────────

function StatsCard({
	title,
	value,
	loading,
	icon: Icon,
	hidden,
}: {
	title: string;
	value: number | undefined | null;
	loading: boolean;
	icon: React.ElementType;
	hidden?: boolean;
}) {
	if (hidden) return null;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
				<Icon className="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				{loading ? (
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				) : (
					<div className="text-2xl font-bold">{value ?? 0}</div>
				)}
			</CardContent>
		</Card>
	);
}
