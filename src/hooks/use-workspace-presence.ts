import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "#/lib/supabase/client";

type PresenceState = {
	userId: string;
	displayName: string;
	avatarUrl: string | null;
};

/**
 * Joins the `workspace:${workspaceId}` presence channel and tracks
 * which users are currently online. Returns a Set of online user IDs
 * and the full presence state for rendering avatars.
 *
 * Supabase Presence auto-removes disconnected users — no manual
 * cleanup needed. The channel is cleaned up on unmount.
 */
export function useWorkspacePresence({
	workspaceId,
	currentUserId,
	displayName,
	avatarUrl,
}: {
	workspaceId: string;
	currentUserId: string;
	displayName: string;
	avatarUrl: string | null;
}) {
	const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
	const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		const supabase = getSupabaseBrowserClient();

		const channel: RealtimeChannel = supabase.channel(
			`workspace:${workspaceId}`,
		);

		// Sync presence state whenever it changes (join, leave, reconnect)
		channel.on("presence", { event: "sync" }, () => {
			const state = channel.presenceState<PresenceState>();

			// Flatten: each key has an array of presence objects
			const users: PresenceState[] = [];
			const ids = new Set<string>();

			for (const presences of Object.values(state)) {
				for (const p of presences) {
					// Deduplicate — a user might have multiple tabs open
					if (!ids.has(p.userId)) {
						ids.add(p.userId);
						users.push({
							userId: p.userId,
							displayName: p.displayName,
							avatarUrl: p.avatarUrl,
						});
					}
				}
			}

			setOnlineUsers(users);
			setOnlineIds(ids);
		});

		// Subscribe and track our own presence
		channel.subscribe(async (status) => {
			if (status === "SUBSCRIBED") {
				await channel.track({
					userId: currentUserId,
					displayName,
					avatarUrl,
				});
			}
		});

		return () => {
			supabase.removeChannel(channel);
		};
	}, [workspaceId, currentUserId, displayName, avatarUrl]);

	return { onlineUsers, onlineIds };
}
