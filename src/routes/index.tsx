import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
			<div className="text-center">
				<h1 className="text-4xl font-bold tracking-tight text-foreground">
					TeamForge
				</h1>
				<p className="mt-2 text-muted-foreground">
					Workspace-based team collaboration.
				</p>
			</div>
		</main>
	);
}
