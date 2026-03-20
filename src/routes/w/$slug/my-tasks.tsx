import {
	createFileRoute,
	getRouteApi,
	Link,
	redirect,
} from "@tanstack/react-router";
import { Flag, Folder } from "lucide-react";
import { useState } from "react";
import { RouteError } from "#/components/route-error";
import { ListPageSkeleton } from "#/components/route-pending";
import { Badge } from "#/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { listMyTasks } from "#/lib/task/my-tasks";
import { getWorkspaceBySlug } from "#/lib/workspace/functions";

export const Route = createFileRoute("/w/$slug/my-tasks")({
	loader: async ({ params }) => {
		const workspace = await getWorkspaceBySlug({
			data: { slug: params.slug },
		});
		if (!workspace) {
			throw redirect({ to: "/workspaces" });
		}
		const myTasks = await listMyTasks({
			data: { workspaceId: workspace.id },
		});
		return { myTasks };
	},
	component: MyTasksPage,
	pendingComponent: ListPageSkeleton,
	errorComponent: ({ error, reset }) => (
		<RouteError error={error} reset={reset} />
	),
});

const workspaceRoute = getRouteApi("/w/$slug");

const STATUS_OPTIONS = [
	{ value: "all", label: "All statuses" },
	{ value: "backlog", label: "Backlog" },
	{ value: "todo", label: "To Do" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "in_review", label: "In Review" },
	{ value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
	{ value: "all", label: "All priorities" },
	{ value: "urgent", label: "Urgent" },
	{ value: "high", label: "High" },
	{ value: "medium", label: "Medium" },
	{ value: "low", label: "Low" },
];

const statusLabels: Record<string, string> = {
	backlog: "Backlog",
	todo: "To Do",
	in_progress: "In Progress",
	in_review: "In Review",
	done: "Done",
};

const priorityColors: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	low: "secondary",
	medium: "outline",
	high: "default",
	urgent: "destructive",
};

type MyTask = {
	id: string;
	title: string;
	description: string | null;
	status: string;
	priority: string;
	position: number;
	dueDate: string | null;
	assignedTo: string | null;
	projectId: string;
	projectName: string;
	createdAt: string;
};

function MyTasksPage() {
	const { workspace } = workspaceRoute.useLoaderData();
	const { myTasks } = Route.useLoaderData();

	const [statusFilter, setStatusFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");

	// Apply filters
	const filtered = myTasks.filter((task: MyTask) => {
		if (statusFilter !== "all" && task.status !== statusFilter) return false;
		if (priorityFilter !== "all" && task.priority !== priorityFilter)
			return false;
		return true;
	});

	// Group by project
	const grouped = new Map<string, { name: string; tasks: MyTask[] }>();
	for (const task of filtered) {
		if (!grouped.has(task.projectId)) {
			grouped.set(task.projectId, {
				name: task.projectName,
				tasks: [],
			});
		}
		grouped.get(task.projectId)!.tasks.push(task);
	}

	return (
		<div className="p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-bold text-foreground">My Tasks</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{filtered.length} task{filtered.length !== 1 ? "s" : ""} assigned to
						you
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{STATUS_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={priorityFilter} onValueChange={setPriorityFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PRIORITY_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="mt-6 max-w-3xl space-y-6">
				{grouped.size === 0 ? (
					<div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
						{myTasks.length === 0
							? "No tasks assigned to you yet. Tasks will appear here when someone assigns you to a task."
							: "No tasks match your filters."}
					</div>
				) : (
					[...grouped.entries()].map(([projectId, { name, tasks }]) => (
						<div key={projectId}>
							<div className="mb-2 flex items-center gap-2">
								<Folder className="size-4 text-muted-foreground" />
								<Link
									to="/w/$slug/projects/$projectId"
									params={{
										slug: workspace.slug,
										projectId,
									}}
									className="text-sm font-medium text-foreground hover:underline"
								>
									{name}
								</Link>
								<span className="text-xs text-muted-foreground">
									({tasks.length})
								</span>
							</div>
							<div className="space-y-1.5">
								{tasks.map((task) => (
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
											{task.description && (
												<p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
													{task.description}
												</p>
											)}
										</div>
										<div className="flex shrink-0 items-center gap-2">
											<Badge
												variant={priorityColors[task.priority] ?? "outline"}
												className="text-[10px]"
											>
												<Flag className="size-2.5" />
												{task.priority}
											</Badge>
											<Badge variant="outline" className="text-[10px]">
												{statusLabels[task.status] ?? task.status}
											</Badge>
											{task.dueDate && (
												<span className="text-[10px] text-muted-foreground">
													{task.dueDate}
												</span>
											)}
										</div>
									</Link>
								))}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
