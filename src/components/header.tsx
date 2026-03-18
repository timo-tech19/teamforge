import { Link } from "@tanstack/react-router";
import ThemeToggle from "./theme-toggle";
import { Button } from "./ui/button";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
			<nav className="mx-auto flex h-14 max-w-5xl items-center justify-between">
				<Link
					to="/"
					className="text-base font-semibold tracking-tight text-foreground no-underline"
				>
					TeamForge
				</Link>
				<div className="flex items-center gap-2">
					<ThemeToggle />
					<Button asChild variant="ghost" size="sm">
						<Link to="/login">Sign in</Link>
					</Button>
					<Button asChild size="sm">
						<Link to="/signup">Sign up</Link>
					</Button>
				</div>
			</nav>
		</header>
	);
}
