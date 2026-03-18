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
	loginWithEmail,
	type SignupInput,
	signupSchema,
	signupWithEmail,
} from "#/lib/auth/functions";

export const Route = createFileRoute("/signup")({
	beforeLoad: async () => {
		const user = await getUser();
		if (user) {
			throw redirect({ to: "/workspaces" });
		}
	},
	component: SignupPage,
});

function SignupPage() {
	const navigate = useNavigate();
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setErrors({});
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const raw: SignupInput = {
			displayName: formData.get("displayName") as string,
			email: formData.get("email") as string,
			password: formData.get("password") as string,
		};

		const result = signupSchema.safeParse(raw);
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

		const signupResult = await signupWithEmail({ data: result.data });

		if (signupResult.error) {
			setErrors({ form: signupResult.error });
			setLoading(false);
			return;
		}

		// Auto-login after successful signup
		const loginResult = await loginWithEmail({
			data: { email: result.data.email, password: result.data.password },
		});

		if (loginResult.error) {
			// Signup succeeded but auto-login failed — send to login page
			navigate({ to: "/login" });
			return;
		}

		navigate({ to: "/workspaces" });
	}

	return (
		<main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Create your account</CardTitle>
					<CardDescription>Get started with TeamForge for free</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{errors.form && (
							<div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
								{errors.form}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="displayName">Display name</Label>
							<Input
								id="displayName"
								name="displayName"
								type="text"
								autoComplete="name"
								aria-invalid={!!errors.displayName}
							/>
							{errors.displayName && (
								<p className="text-sm text-destructive-foreground">
									{errors.displayName}
								</p>
							)}
						</div>

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
								minLength={6}
								autoComplete="new-password"
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
							{loading ? "Creating account..." : "Create account"}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link to="/login" className="font-medium text-foreground underline">
							Sign in
						</Link>
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
