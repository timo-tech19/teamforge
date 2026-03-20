import { createFileRoute, getRouteApi, redirect } from "@tanstack/react-router";
import {
	CheckCircle2,
	FileText,
	Layers,
	MessageSquare,
	Pencil,
	Trash2,
	UserMinus,
	UserPlus,
} from "lucide-react";
import { useState } from "react";
import { RouteError } from "#/components/route-error";
import { ListPageSkeleton } from "#/components/route-pending";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import UserAvatar from "#/components/user-avatar";
import { listActivityByWorkspace } from "#/lib/activity/functions";
import { formatRelativeTime } from "#/lib/utils";
import { getWorkspaceBySlug } from "#/lib/workspace/functions";

export const Route = createFileRoute("/w/$slug/activity")({
	loader: async ({ params }) => {
		const workspace = await getWorkspaceBySlug({
			data: { slug: params.slug },
		});
		if (!workspace) {
			throw redirect({ to: "/workspaces" });
		}
		const activity = await listActivityByWorkspace({
			data: { workspaceId: workspace.id },
		});
		return { activity };
	},
	component: ActivityPage,
	pendingComponent: ListPageSkeleton,
	errorComponent: ({ error, reset }) => (
		<RouteError error={error} reset={reset} />
	),
});

// ── Action display config ─────────────────────────────────────────────

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
				return `completed task "${meta?.task_title ?? "Untitled"}"`;
			}
			return `moved "${meta?.task_title ?? "Untitled"}" from ${formatStatus(meta?.old_status)} to ${formatStatus(meta?.new_status)}`;
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

function formatStatus(status: string | undefined): string {
	if (!status) return "unknown";
	return status.replace(/_/g, " ");
}

// ── Activity item component ───────────────────────────────────────────

type ActivityItem = {
	id: string;
	action: string;
	metadata: Record<string, string> | null;
	createdAt: string;
	actorId: string | null;
	actorName: string;
	actorAvatar: string | null;
	projectId: string | null;
	projectName: string | null;
};

function ActivityEntry({ item }: { item: ActivityItem }) {
	const config = ACTION_CONFIG[item.action];
	const Icon = config?.icon ?? FileText;
	const label = config?.label(item.metadata) ?? item.action;

	return (
		<div className="flex items-start gap-3 py-3">
			<UserAvatar
				displayName={item.actorName}
				avatarUrl={item.actorAvatar}
				size="sm"
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm text-foreground">
					<span className="font-medium">{item.actorName}</span> {label}
				</p>
				<div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
					<Icon className="size-3" />
					{item.projectName && <span>{item.projectName}</span>}
					<span>{formatRelativeTime(item.createdAt)}</span>
				</div>
			</div>
		</div>
	);
}

// ── Page component ────────────────────────────────────────────────────

const workspaceRoute = getRouteApi("/w/$slug");

function ActivityPage() {
	const { workspace } = workspaceRoute.useLoaderData();
	const { activity: initialActivity } = Route.useLoaderData();

	const [items, setItems] = useState(initialActivity.items);
	const [nextCursor, setNextCursor] = useState(initialActivity.nextCursor);
	const [loading, setLoading] = useState(false);

	async function loadMore() {
		if (!nextCursor || loading) return;
		setLoading(true);

		const result = await listActivityByWorkspace({
			data: { workspaceId: workspace.id, cursor: nextCursor },
		});

		setItems((prev) => [...prev, ...result.items]);
		setNextCursor(result.nextCursor);
		setLoading(false);
	}

	return (
		<div className="p-6">
			<h1 className="text-xl font-bold text-foreground">Activity</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Recent activity across this workspace.
			</p>

			<div className="mt-6 max-w-2xl">
				{items.length === 0 ? (
					<div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
						No activity yet. Activity will appear here as your team creates
						projects, tasks, and comments.
					</div>
				) : (
					<div className="divide-y divide-border">
						{items.map((item) => (
							<ActivityEntry key={item.id} item={item} />
						))}
					</div>
				)}

				{nextCursor && (
					<div className="mt-4 text-center">
						<Button
							variant="outline"
							size="sm"
							onClick={loadMore}
							disabled={loading}
						>
							{loading && <Spinner />}
							{loading ? "Loading..." : "Load more"}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
