import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "#/lib/supabase/server";

export const loginSchema = z.object({
	email: z.email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
	displayName: z
		.string()
		.min(2, "Display name must be at least 2 characters")
		.max(50, "Display name must be under 50 characters"),
	email: z.email("Please enter a valid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters")
		.max(72, "Password must be under 72 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
	const supabase = getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return user;
});

export const getUserProfile = createServerFn({ method: "GET" }).handler(
	async () => {
		const supabase = getSupabaseServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) return null;

		const { data: profile } = await supabase
			.from("profiles")
			.select("display_name, avatar_url")
			.eq("id", user.id)
			.single();

		if (!profile) return null;

		return {
			id: user.id,
			email: user.email ?? "",
			displayName: profile.display_name,
			avatarUrl: profile.avatar_url,
		};
	},
);

export const loginWithEmail = createServerFn({ method: "POST" })
	.inputValidator(loginSchema)
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
	.inputValidator(signupSchema)
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
