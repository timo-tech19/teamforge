import { Skeleton } from "#/components/ui/skeleton";

const NAV_ITEMS = ["nav-0", "nav-1", "nav-2", "nav-3", "nav-4"];
const PROJ_ITEMS = ["proj-0", "proj-1", "proj-2"];
const COLUMNS = [
	{ key: "col-0", cards: ["c0-0", "c0-1", "c0-2"] },
	{ key: "col-1", cards: ["c1-0"] },
	{ key: "col-2", cards: ["c2-0", "c2-1"] },
	{ key: "col-3", cards: ["c3-0"] },
	{ key: "col-4", cards: ["c4-0"] },
];
const LIST_ITEMS = ["li-0", "li-1", "li-2", "li-3", "li-4", "li-5"];

/**
 * Skeleton for the workspace sidebar layout.
 */
export function WorkspaceLayoutSkeleton() {
	return (
		<div className="flex h-screen">
			{/* Sidebar skeleton */}
			<div className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4">
				<Skeleton className="h-10 w-full rounded-lg" />
				<div className="mt-6 space-y-2">
					{NAV_ITEMS.map((key) => (
						<Skeleton key={key} className="h-8 w-full rounded-md" />
					))}
				</div>
				<div className="mt-6 space-y-2">
					<Skeleton className="h-4 w-20" />
					{PROJ_ITEMS.map((key) => (
						<Skeleton key={key} className="h-8 w-full rounded-md" />
					))}
				</div>
			</div>
			{/* Main content skeleton */}
			<div className="flex-1 p-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="mt-2 h-4 w-72" />
				<div className="mt-8">
					<Skeleton className="h-64 w-full rounded-lg" />
				</div>
			</div>
		</div>
	);
}

/**
 * Skeleton for the kanban board (5 columns with card placeholders).
 */
export function KanbanSkeleton() {
	return (
		<div className="p-6">
			<div className="flex items-center justify-between border-b border-border px-6 py-4">
				<div className="flex items-center gap-3">
					<Skeleton className="h-7 w-40" />
					<Skeleton className="h-5 w-16 rounded-full" />
				</div>
				<Skeleton className="h-8 w-24 rounded-md" />
			</div>
			<div className="flex gap-4 overflow-x-auto p-6">
				{COLUMNS.map((col) => (
					<div
						key={col.key}
						className="flex w-64 shrink-0 flex-col rounded-lg bg-muted/50"
					>
						<div className="flex items-center justify-between px-3 py-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-4" />
						</div>
						<div className="flex flex-col gap-2 px-2 pb-2">
							{col.cards.map((cardKey) => (
								<Skeleton key={cardKey} className="h-20 w-full rounded-md" />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Skeleton for list pages (activity, members, my-tasks).
 */
export function ListPageSkeleton() {
	return (
		<div className="p-6">
			<Skeleton className="h-7 w-32" />
			<Skeleton className="mt-2 h-4 w-56" />
			<div className="mt-8 max-w-2xl space-y-3">
				{LIST_ITEMS.map((key) => (
					<Skeleton key={key} className="h-16 w-full rounded-lg" />
				))}
			</div>
		</div>
	);
}
