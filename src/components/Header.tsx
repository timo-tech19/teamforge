import { Link } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";

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
				<ThemeToggle />
			</nav>
		</header>
	);
}
