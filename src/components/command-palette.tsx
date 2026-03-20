import { useNavigate } from "@tanstack/react-router";
import {
	Folder,
	Layers,
	ListTodo,
	Search,
	UserPlus,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "#/components/ui/command";
import UserAvatar from "#/components/user-avatar";
import { searchWorkspace } from "#/lib/search/functions";

type SearchResults = {
	projects: { id: string; name: string; status: string }[];
	tasks: { id: string; title: string; status: string; projectId: string }[];
	members: {
		userId: string;
		displayName: string;
		avatarUrl: string | null;
	}[];
};

const EMPTY_RESULTS: SearchResults = {
	projects: [],
	tasks: [],
	members: [],
};

export function CommandPalette({
	workspaceId,
	workspaceSlug,
	open,
	onOpenChange,
}: {
	workspaceId: string;
	workspaceSlug: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
	const [searching, setSearching] = useState(false);

	// Debounced search
	useEffect(() => {
		if (!query.trim()) {
			setResults(EMPTY_RESULTS);
			return;
		}

		const timeout = setTimeout(async () => {
			setSearching(true);
			try {
				const data = await searchWorkspace({
					data: { workspaceId, query: query.trim() },
				});
				setResults(data);
			} catch {
				setResults(EMPTY_RESULTS);
			}
			setSearching(false);
		}, 200);

		return () => clearTimeout(timeout);
	}, [query, workspaceId]);

	// Reset state when dialog closes
	useEffect(() => {
		if (!open) {
			setQuery("");
			setResults(EMPTY_RESULTS);
		}
	}, [open]);

	const close = useCallback(() => onOpenChange(false), [onOpenChange]);

	function navigateToProject(projectId: string) {
		close();
		navigate({
			to: "/w/$slug/projects/$projectId",
			params: { slug: workspaceSlug, projectId },
		});
	}

	function navigateToMembers() {
		close();
		navigate({
			to: "/w/$slug/members",
			params: { slug: workspaceSlug },
		});
	}

	const hasResults =
		results.projects.length > 0 ||
		results.tasks.length > 0 ||
		results.members.length > 0;
	const isSearching = query.trim().length > 0;

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Command Palette"
			description="Search projects, tasks, and members"
			showCloseButton={false}
		>
			<CommandInput
				placeholder="Search projects, tasks, members..."
				value={query}
				onValueChange={setQuery}
			/>
			<CommandList>
				{isSearching && !hasResults && !searching && (
					<CommandEmpty>No results found.</CommandEmpty>
				)}
				{isSearching && searching && <CommandEmpty>Searching...</CommandEmpty>}

				{/* Search results */}
				{results.projects.length > 0 && (
					<CommandGroup heading="Projects">
						{results.projects.map((project) => (
							<CommandItem
								key={project.id}
								value={`project-${project.name}`}
								onSelect={() => navigateToProject(project.id)}
							>
								<Folder className="text-muted-foreground" />
								<span>{project.name}</span>
								<span className="ml-auto text-xs text-muted-foreground">
									{project.status}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{results.tasks.length > 0 && (
					<CommandGroup heading="Tasks">
						{results.tasks.map((task) => (
							<CommandItem
								key={task.id}
								value={`task-${task.title}`}
								onSelect={() => {
									close();
									navigate({
										to: "/w/$slug/projects/$projectId",
										params: {
											slug: workspaceSlug,
											projectId: task.projectId,
										},
										search: { task: task.id },
									});
								}}
							>
								<ListTodo className="text-muted-foreground" />
								<span>{task.title}</span>
								<span className="ml-auto text-xs text-muted-foreground">
									{task.status.replace(/_/g, " ")}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{results.members.length > 0 && (
					<CommandGroup heading="Members">
						{results.members.map((member) => (
							<CommandItem
								key={member.userId}
								value={`member-${member.displayName}`}
								onSelect={navigateToMembers}
							>
								<UserAvatar
									displayName={member.displayName}
									avatarUrl={member.avatarUrl}
									size="sm"
								/>
								<span>{member.displayName}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{/* Quick actions — always visible */}
				{!isSearching && (
					<>
						<CommandGroup heading="Navigation">
							<CommandItem
								value="go-to-projects"
								onSelect={() => {
									close();
									navigate({
										to: "/w/$slug/projects",
										params: { slug: workspaceSlug },
									});
								}}
							>
								<Layers className="text-muted-foreground" />
								<span>Go to Projects</span>
							</CommandItem>
							<CommandItem value="go-to-members" onSelect={navigateToMembers}>
								<Users className="text-muted-foreground" />
								<span>Go to Members</span>
							</CommandItem>
							<CommandItem
								value="go-to-activity"
								onSelect={() => {
									close();
									navigate({
										to: "/w/$slug/activity",
										params: { slug: workspaceSlug },
									});
								}}
							>
								<Search className="text-muted-foreground" />
								<span>Go to Activity</span>
							</CommandItem>
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup heading="Actions">
							<CommandItem value="invite-member" onSelect={navigateToMembers}>
								<UserPlus className="text-muted-foreground" />
								<span>Invite member</span>
							</CommandItem>
						</CommandGroup>
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
}
