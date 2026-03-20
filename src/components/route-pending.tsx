import { Skeleton } from "#/components/ui/skeleton";

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
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={`nav-${i}`} className="h-8 w-full rounded-md" />
					))}
				</div>
				<div className="mt-6 space-y-2">
					<Skeleton className="h-4 w-20" />
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={`proj-${i}`} className="h-8 w-full rounded-md" />
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
				{Array.from({ length: 5 }).map((_, col) => (
					<div
						key={`col-${col}`}
						className="flex w-64 shrink-0 flex-col rounded-lg bg-muted/50"
					>
						<div className="flex items-center justify-between px-3 py-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-4" />
						</div>
						<div className="flex flex-col gap-2 px-2 pb-2">
							{Array.from({ length: col === 0 ? 3 : col === 2 ? 2 : 1 }).map(
								(_, card) => (
									<Skeleton
										key={`card-${col}-${card}`}
										className="h-20 w-full rounded-md"
									/>
								),
							)}
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
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={`item-${i}`} className="h-16 w-full rounded-lg" />
				))}
			</div>
		</div>
	);
}
