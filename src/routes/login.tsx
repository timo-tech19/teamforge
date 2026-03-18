import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginWithEmail } from "#/lib/auth/functions";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		const result = await loginWithEmail({ data: { email, password } });

		if (result.error) {
			setError(result.error);
			setLoading(false);
			return;
		}

		navigate({ to: "/workspaces" });
	}

	return (
		<main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
			<div className="w-full max-w-sm">
				<h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-foreground">
					Sign in to TeamForge
				</h1>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
							{error}
						</div>
					)}

					<div>
						<label
							htmlFor="email"
							className="mb-1.5 block text-sm font-medium text-foreground"
						>
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							required
							autoComplete="email"
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-ring focus:ring-2"
						/>
					</div>

					<div>
						<label
							htmlFor="password"
							className="mb-1.5 block text-sm font-medium text-foreground"
						>
							Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							autoComplete="current-password"
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-ring focus:ring-2"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
					>
						{loading ? "Signing in..." : "Sign in"}
					</button>
				</form>

				<p className="mt-6 text-center text-sm text-muted-foreground">
					Don't have an account?{" "}
					<a href="/signup" className="font-medium text-foreground underline">
						Sign up
					</a>
				</p>
			</div>
		</main>
	);
}
