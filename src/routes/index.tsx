import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	ArrowRight,
	Kanban,
	Layers,
	MessageSquare,
	Shield,
	Users,
	Zap,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { getUser } from "#/lib/auth/functions";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const user = await getUser();
		if (user) {
			throw redirect({ to: "/workspaces" });
		}
	},
	component: LandingPage,
});

const features = [
	{
		icon: Layers,
		title: "Workspace isolation",
		description:
			"Every team gets their own workspace. Projects, tasks, and members stay separate — no cross-team noise.",
	},
	{
		icon: Kanban,
		title: "Board & list views",
		description:
			"Drag-and-drop kanban boards for visual thinkers. Switch to list view when you need the full picture.",
	},
	{
		icon: Users,
		title: "Role-based access",
		description:
			"Owners, admins, leads, members, viewers — everyone sees exactly what they need. Nothing more.",
	},
	{
		icon: Zap,
		title: "Real-time updates",
		description:
			"See changes as they happen. Task moves, new comments, and team presence — all live.",
	},
	{
		icon: MessageSquare,
		title: "Threaded comments",
		description:
			"Discuss tasks in context. Keep conversations attached to the work, not scattered across channels.",
	},
	{
		icon: Shield,
		title: "Secure by default",
		description:
			"Row-level security on every table. Your data is isolated at the database level, not just the UI.",
	},
];

function LandingPage() {
	return (
		<>
			{/* Hero */}
			<section className="mx-auto max-w-5xl px-4 pb-24 pt-20 text-center sm:pt-32">
				<div className="mx-auto max-w-3xl">
					<p className="mb-4 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
						Built for teams of 5–50
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
						Your team's work,
						<br />
						<span className="text-muted-foreground">structured simply.</span>
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
						TeamForge gives every team their own workspace with projects, tasks,
						and real-time collaboration. Non-technical members see what matters
						to them. Leadership retains oversight across everything.
					</p>
					<div className="mt-10 flex items-center justify-center gap-3">
						<Button asChild size="lg">
							<Link to="/signup">
								Get started
								<ArrowRight />
							</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link to="/login">Sign in</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="border-t border-border bg-muted/30">
				<div className="mx-auto max-w-5xl px-4 py-24">
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
							Everything your team needs, nothing it doesn't
						</h2>
						<p className="mt-3 text-muted-foreground">
							Simple tools that get out of the way and let your team focus on
							the work.
						</p>
					</div>

					<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<div key={feature.title} className="group">
								<div className="mb-3 inline-flex rounded-lg border border-border bg-background p-2.5 text-foreground shadow-sm transition-colors group-hover:border-foreground/20">
									<feature.icon className="size-5" />
								</div>
								<h3 className="mb-1.5 font-semibold text-foreground">
									{feature.title}
								</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* How it works */}
			<section className="mx-auto max-w-5xl px-4 py-24">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Up and running in minutes
					</h2>
					<p className="mt-3 text-muted-foreground">
						No setup wizards. No onboarding calls. Just start working.
					</p>
				</div>

				<div className="mt-16 grid gap-12 sm:grid-cols-3">
					{[
						{
							step: "01",
							title: "Create a workspace",
							description:
								"Name it, invite your team. Everyone gets the right role from day one.",
						},
						{
							step: "02",
							title: "Add your projects",
							description:
								"Break work into projects. Each one gets its own board, members, and tasks.",
						},
						{
							step: "03",
							title: "Track & collaborate",
							description:
								"Create tasks, drag them across your board, comment in threads — all in real-time.",
						},
					].map((item) => (
						<div key={item.step}>
							<span className="text-sm font-bold text-muted-foreground/50">
								{item.step}
							</span>
							<h3 className="mt-2 font-semibold text-foreground">
								{item.title}
							</h3>
							<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
								{item.description}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="border-t border-border bg-muted/30">
				<div className="mx-auto max-w-5xl px-4 py-24 text-center">
					<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Ready to organize your team?
					</h2>
					<p className="mx-auto mt-3 max-w-md text-muted-foreground">
						Start free. No credit card required. Set up your first workspace in
						under two minutes.
					</p>
					<div className="mt-8">
						<Button asChild size="lg">
							<Link to="/signup">
								Get started for free
								<ArrowRight />
							</Link>
						</Button>
					</div>
				</div>
			</section>
		</>
	);
}
