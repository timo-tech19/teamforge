import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
	const supabase = getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return user;
});

export const loginWithEmail = createServerFn({ method: "POST" })
	.inputValidator(
		(data: unknown) =>
			data as {
				email: string;
				password: string;
			},
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase.auth.signInWithPassword({
			email: data.email,
			password: data.password,
		});

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const signupWithEmail = createServerFn({ method: "POST" })
	.inputValidator(
		(data: unknown) =>
			data as {
				email: string;
				password: string;
				displayName: string;
			},
	)
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase.auth.signUp({
			email: data.email,
			password: data.password,
			options: {
				data: {
					display_name: data.displayName,
				},
			},
		});

		if (error) {
			return { error: error.message };
		}

		return { error: null };
	});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
	const supabase = getSupabaseServerClient();
	await supabase.auth.signOut();
	return { success: true };
});
