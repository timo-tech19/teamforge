import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import {
	getUser,
	type LoginInput,
	loginSchema,
	loginWithEmail,
} from "#/lib/auth/functions";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const user = await getUser();
		if (user) {
			throw redirect({ to: "/workspaces" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setErrors({});
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const raw: LoginInput = {
			email: formData.get("email") as string,
			password: formData.get("password") as string,
		};

		const result = loginSchema.safeParse(raw);
		if (!result.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const field = issue.path[0] as string;
				fieldErrors[field] = issue.message;
			}
			setErrors(fieldErrors);
			setLoading(false);
			return;
		}

		const response = await loginWithEmail({ data: result.data });

		if (response.error) {
			setErrors({ form: response.error });
			setLoading(false);
			return;
		}

		navigate({ to: "/workspaces" });
	}

	return (
		<main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Welcome back</CardTitle>
					<CardDescription>Sign in to your TeamForge account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{errors.form && (
							<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
								{errors.form}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								aria-invalid={!!errors.email}
							/>
							{errors.email && (
								<p className="text-sm text-destructive-foreground">
									{errors.email}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								aria-invalid={!!errors.password}
							/>
							{errors.password && (
								<p className="text-sm text-destructive-foreground">
									{errors.password}
								</p>
							)}
						</div>

						<Button type="submit" className="w-full" disabled={loading}>
							{loading && <Spinner />}
							{loading ? "Signing in..." : "Sign in"}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm text-muted-foreground">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="font-medium text-foreground underline"
						>
							Sign up
						</Link>
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
