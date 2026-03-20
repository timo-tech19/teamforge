import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";

/**
 * Error component for route errors. Shows the error message
 * and a retry button that calls the router's reset function.
 */
export function RouteError({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	return (
		<div className="flex min-h-[400px] items-center justify-center p-6">
			<div className="max-w-md text-center">
				<AlertTriangle className="mx-auto size-10 text-destructive" />
				<h2 className="mt-4 text-lg font-semibold text-foreground">
					Something went wrong
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					{error.message || "An unexpected error occurred."}
				</p>
				<Button onClick={reset} variant="outline" className="mt-4">
					<RefreshCw className="size-3.5" />
					Try again
				</Button>
			</div>
		</div>
	);
}

/**
 * Global error fallback for the root route.
 */
export function GlobalError({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-6">
			<div className="max-w-md text-center">
				<AlertTriangle className="mx-auto size-12 text-destructive" />
				<h1 className="mt-4 text-xl font-bold text-foreground">
					Something went wrong
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{error.message || "An unexpected error occurred."}
				</p>
				<Button onClick={reset} className="mt-6">
					<RefreshCw className="size-3.5" />
					Try again
				</Button>
			</div>
		</div>
	);
}
