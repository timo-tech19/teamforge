import { createFileRoute, Outlet } from "@tanstack/react-router";
import Footer from "#/components/footer";
import Header from "#/components/header";
import { getUserProfile } from "#/lib/auth/functions";

export const Route = createFileRoute("/_public")({
	loader: async () => {
		const profile = await getUserProfile();
		return { profile };
	},
	component: PublicLayout,
});

function PublicLayout() {
	const { profile } = Route.useLoaderData();

	return (
		<>
			<Header profile={profile} />
			<Outlet />
			<Footer />
		</>
	);
}
