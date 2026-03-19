import {
	type CollisionDetection,
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	getFirstCollision,
	MeasuringStrategy,
	PointerSensor,
	pointerWithin,
	rectIntersection,
	type UniqueIdentifier,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flag, GripVertical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { reorderTasks } from "#/lib/task/functions";

type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

export type Task = {
	id: string;
	title: string;
	description: string | null;
	status: string;
	priority: string;
	position: number;
	dueDate: string | null;
	assignedTo: string | null;
	createdBy: string | null;
	createdAt: string;
};

type Column = { id: string; label: string };

const COLUMNS: Column[] = [
	{ id: "backlog", label: "Backlog" },
	{ id: "todo", label: "To Do" },
	{ id: "in_progress", label: "In Progress" },
	{ id: "in_review", label: "In Review" },
	{ id: "done", label: "Done" },
];

const COLUMN_IDS = new Set(COLUMNS.map((c) => c.id));

const priorityColors: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	low: "secondary",
	medium: "outline",
	high: "default",
	urgent: "destructive",
};

function groupByStatus(tasks: Task[]): Record<string, Task[]> {
	const groups: Record<string, Task[]> = {};
	for (const col of COLUMNS) {
		groups[col.id] = [];
	}
	for (const task of tasks) {
		if (groups[task.status]) {
			groups[task.status].push(task);
		}
	}
	for (const col of COLUMNS) {
		groups[col.id].sort((a, b) => a.position - b.position);
	}
	return groups;
}

function findContainer(
	columns: Record<string, Task[]>,
	id: string,
): string | null {
	// Check if id IS a column id
	if (id in columns) return id;
	// Otherwise find which column contains this task
	for (const [colId, tasks] of Object.entries(columns)) {
		if (tasks.some((t) => t.id === id)) return colId;
	}
	return null;
}

// ── Task Card (sortable) ──────────────────────────────────────────────

function TaskCard({
	task,
	onClick,
	isDragOverlay,
}: {
	task: Task;
	onClick?: () => void;
	isDragOverlay?: boolean;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.3 : 1,
	};

	return (
		<button
			type="button"
			ref={isDragOverlay ? undefined : setNodeRef}
			style={isDragOverlay ? undefined : style}
			className="group w-full cursor-pointer rounded-md border border-border bg-card p-3 text-left shadow-xs transition hover:border-foreground/20"
			onClick={onClick}
		>
			<div className="flex items-start gap-2">
				<div
					className="mt-0.5 cursor-grab touch-none text-muted-foreground opacity-0 transition group-hover:opacity-100"
					{...(isDragOverlay ? {} : { ...attributes, ...listeners })}
				>
					<GripVertical className="size-3.5" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium text-foreground">{task.title}</p>
					{task.description && (
						<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
							{task.description}
						</p>
					)}
					<div className="mt-2 flex items-center gap-1.5">
						<Badge
							variant={priorityColors[task.priority] ?? "outline"}
							className="text-[10px]"
						>
							<Flag className="size-2.5" />
							{task.priority}
						</Badge>
						{task.dueDate && (
							<span className="text-[10px] text-muted-foreground">
								{task.dueDate}
							</span>
						)}
					</div>
				</div>
			</div>
		</button>
	);
}

// ── Column (droppable + sortable context) ─────────────────────────────

function KanbanColumn({
	column,
	tasks,
	onTaskClick,
}: {
	column: Column;
	tasks: Task[];
	onTaskClick: (task: Task) => void;
}) {
	const { setNodeRef } = useDroppable({ id: column.id });
	const taskIds = tasks.map((t) => t.id);

	return (
		<div className="flex w-64 shrink-0 flex-col rounded-lg bg-muted/50">
			<div className="flex items-center justify-between px-3 py-2">
				<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{column.label}
				</h3>
				<span className="text-xs text-muted-foreground">{tasks.length}</span>
			</div>
			<SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
				<div
					ref={setNodeRef}
					className="flex flex-1 flex-col gap-2 px-2 pb-2"
					style={{ minHeight: "4rem" }}
				>
					{tasks.map((task) => (
						<TaskCard
							key={task.id}
							task={task}
							onClick={() => onTaskClick(task)}
						/>
					))}
				</div>
			</SortableContext>
		</div>
	);
}

// ── Static column (SSR) ───────────────────────────────────────────────

function StaticColumn({
	column,
	tasks,
	onTaskClick,
}: {
	column: Column;
	tasks: Task[];
	onTaskClick: (task: Task) => void;
}) {
	return (
		<div className="flex w-64 shrink-0 flex-col rounded-lg bg-muted/50">
			<div className="flex items-center justify-between px-3 py-2">
				<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{column.label}
				</h3>
				<span className="text-xs text-muted-foreground">{tasks.length}</span>
			</div>
			<div
				className="flex flex-1 flex-col gap-2 px-2 pb-2"
				style={{ minHeight: "4rem" }}
			>
				{tasks.map((task) => (
					<button
						type="button"
						key={task.id}
						className="group w-full cursor-pointer rounded-md border border-border bg-card p-3 text-left shadow-xs transition hover:border-foreground/20"
						onClick={() => onTaskClick(task)}
					>
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">
								{task.title}
							</p>
							{task.description && (
								<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
									{task.description}
								</p>
							)}
							<div className="mt-2 flex items-center gap-1.5">
								<Badge
									variant={priorityColors[task.priority] ?? "outline"}
									className="text-[10px]"
								>
									<Flag className="size-2.5" />
									{task.priority}
								</Badge>
								{task.dueDate && (
									<span className="text-[10px] text-muted-foreground">
										{task.dueDate}
									</span>
								)}
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

// ── Kanban Board ──────────────────────────────────────────────────────

const measuring = {
	droppable: { strategy: MeasuringStrategy.Always as const },
};

export function KanbanBoard({
	tasks: initialTasks,
	onTaskClick,
}: {
	tasks: Task[];
	onTaskClick: (task: Task) => void;
}) {
	const [columns, setColumns] = useState(() => groupByStatus(initialTasks));
	const [clonedColumns, setClonedColumns] = useState<Record<
		string,
		Task[]
	> | null>(null);
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
	const [mounted, setMounted] = useState(false);

	// Always holds the latest columns state — needed because handleDragEnd
	// may read a stale closure if React batched handleDragOver's setColumns.
	const columnsRef = useRef(columns);
	columnsRef.current = columns;

	// Refs for custom collision detection
	const lastOverId = useRef<UniqueIdentifier | null>(null);
	const recentlyMovedToNewContainer = useRef(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	// Sync when tasks change from loader
	const tasksKey = initialTasks
		.map((t) => `${t.id}:${t.status}:${t.position}:${t.priority}`)
		.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-sync on task data changes only
	useEffect(() => {
		setColumns(groupByStatus(initialTasks));
	}, [tasksKey]);

	// Reset recentlyMovedToNewContainer after layout settles.
	// columns is intentionally in deps — we need this to fire on every column change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: must run when columns change
	useEffect(() => {
		requestAnimationFrame(() => {
			recentlyMovedToNewContainer.current = false;
		});
	}, [columns]);

	// Custom collision detection: pointerWithin → rectIntersection → closestCenter within container
	const collisionDetection: CollisionDetection = useCallback(
		(args) => {
			// For items: pointer first, then rectangle fallback
			const pointerCollisions = pointerWithin(args);
			const intersections =
				pointerCollisions.length > 0
					? pointerCollisions
					: rectIntersection(args);

			let overId = getFirstCollision(intersections, "id");

			if (overId != null) {
				// If over a column, find the closest item within it
				if (COLUMN_IDS.has(overId as string)) {
					const containerItems = columns[overId as string] ?? [];
					if (containerItems.length > 0) {
						const closest = closestCenter({
							...args,
							droppableContainers: args.droppableContainers.filter(
								(container) =>
									container.id !== overId &&
									containerItems.some((t) => t.id === container.id),
							),
						});
						if (closest[0]) {
							overId = closest[0].id;
						}
					}
				}
				lastOverId.current = overId;
				return [{ id: overId }];
			}

			// Fallback for layout shifts after container change
			if (recentlyMovedToNewContainer.current) {
				lastOverId.current = activeId;
			}

			return lastOverId.current ? [{ id: lastOverId.current }] : [];
		},
		[activeId, columns],
	);

	// Find the active task object
	const activeTask = (() => {
		if (!activeId) return null;
		for (const tasks of Object.values(columns)) {
			const task = tasks.find((t) => t.id === activeId);
			if (task) return task;
		}
		return null;
	})();

	function handleDragStart(event: DragStartEvent) {
		setActiveId(event.active.id);
		setClonedColumns({ ...columns });
	}

	function handleDragOver(event: DragOverEvent) {
		const { active, over } = event;
		if (!over) return;

		const overId = over.id as string;
		const activeIdStr = active.id as string;

		const activeContainer = findContainer(columns, activeIdStr);
		const overContainer = findContainer(columns, overId);

		if (
			!activeContainer ||
			!overContainer ||
			activeContainer === overContainer
		) {
			return;
		}

		setColumns((prev) => {
			const activeItems = prev[activeContainer];
			const overItems = prev[overContainer];
			const activeIndex = activeItems.findIndex((t) => t.id === activeIdStr);
			const overIndex = overItems.findIndex((t) => t.id === overId);

			let newIndex: number;
			if (COLUMN_IDS.has(overId)) {
				// Dropped directly on a column container
				newIndex = overItems.length;
			} else {
				const isBelowOverItem =
					over &&
					active.rect.current.translated &&
					active.rect.current.translated.top > over.rect.top + over.rect.height;
				const modifier = isBelowOverItem ? 1 : 0;
				newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
			}

			recentlyMovedToNewContainer.current = true;

			const movedTask = { ...activeItems[activeIndex], status: overContainer };

			return {
				...prev,
				[activeContainer]: activeItems.filter((t) => t.id !== activeIdStr),
				[overContainer]: [
					...overItems.slice(0, newIndex),
					movedTask,
					...overItems.slice(newIndex),
				],
			};
		});
	}

	async function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		setActiveId(null);
		setClonedColumns(null);

		if (!over) return;

		const activeIdStr = active.id as string;
		const overId = over.id as string;

		// Read from ref to get the latest state (includes onDragOver changes)
		const current = columnsRef.current;

		const activeContainer = findContainer(current, activeIdStr);
		const overContainer = findContainer(current, overId);

		if (!activeContainer || !overContainer) return;

		// By now, onDragOver already moved the item to the right column.
		// We only need to finalize the index within the same column.
		let finalColumns = current;

		if (activeContainer === overContainer) {
			const items = current[overContainer];
			const activeIndex = items.findIndex((t) => t.id === activeIdStr);
			const overIndex = items.findIndex((t) => t.id === overId);

			if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
				finalColumns = {
					...current,
					[overContainer]: arrayMove(items, activeIndex, overIndex),
				};
				setColumns(finalColumns);
			}
		}

		// Persist: compute what changed and save to server
		const allUpdates: {
			id: string;
			status: TaskStatus;
			position: number;
		}[] = [];

		for (const col of COLUMNS) {
			const tasks = finalColumns[col.id] ?? [];
			for (let i = 0; i < tasks.length; i++) {
				const task = tasks[i];
				if (task.status !== col.id || task.position !== i) {
					allUpdates.push({
						id: task.id,
						status: col.id as TaskStatus,
						position: i,
					});
				}
			}
		}

		if (allUpdates.length > 0) {
			await reorderTasks({ data: { tasks: allUpdates } });
		}
	}

	function handleDragCancel() {
		if (clonedColumns) {
			setColumns(clonedColumns);
		}
		setActiveId(null);
		setClonedColumns(null);
	}

	// Render static columns during SSR
	if (!mounted) {
		return (
			<div className="flex gap-4 overflow-x-auto pb-4">
				{COLUMNS.map((column) => (
					<StaticColumn
						key={column.id}
						column={column}
						tasks={columns[column.id] ?? []}
						onTaskClick={onTaskClick}
					/>
				))}
			</div>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			measuring={measuring}
			collisionDetection={collisionDetection}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<div className="flex gap-4 overflow-x-auto pb-4">
				{COLUMNS.map((column) => (
					<KanbanColumn
						key={column.id}
						column={column}
						tasks={columns[column.id] ?? []}
						onTaskClick={onTaskClick}
					/>
				))}
			</div>

			<DragOverlay>
				{activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
			</DragOverlay>
		</DndContext>
	);
}
