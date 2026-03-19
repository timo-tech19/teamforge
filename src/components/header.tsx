import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { logout } from "#/lib/auth/functions";
import ThemeToggle from "./theme-toggle";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserAvatar from "./user-avatar";

type Profile = {
	id: string;
	email: string;
	displayName: string;
	avatarUrl: string | null;
};

export default function Header({ profile }: { profile: Profile | null }) {
	async function handleLogout() {
		await logout();
		window.location.href = "/";
	}

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
					{profile ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="relative size-8 rounded-full"
								>
									<UserAvatar
										displayName={profile.displayName}
										avatarUrl={profile.avatarUrl}
									/>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col gap-1">
										<p className="text-sm font-medium leading-none">
											{profile.displayName}
										</p>
										<p className="text-xs leading-none text-muted-foreground">
											{profile.email}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogout}>
									<LogOut />
									Sign out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<>
							<Button asChild variant="ghost" size="sm">
								<Link to="/login">Sign in</Link>
							</Button>
							<Button asChild size="sm">
								<Link to="/signup">Sign up</Link>
							</Button>
						</>
					)}
				</div>
			</nav>
		</header>
	);
}
