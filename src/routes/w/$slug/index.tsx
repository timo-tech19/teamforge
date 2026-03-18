import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/w/$slug/")({
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div className="p-6">
			<h1 className="text-xl font-bold text-foreground">Dashboard</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Workspace overview — activity feed and stats will live here.
			</p>
			<div className="mt-8 rounded-lg border border-border p-8 text-center text-muted-foreground">
				Coming soon
			</div>
		</div>
	);
}
