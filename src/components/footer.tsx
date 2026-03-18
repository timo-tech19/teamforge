export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-border px-4 py-6">
			<div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
				&copy; {year} TeamForge
			</div>
		</footer>
	);
}
