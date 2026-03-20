import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
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
	onJoin,
	onLeave,
}: {
	workspaceId: string;
	currentUserId: string;
	displayName: string;
	avatarUrl: string | null;
	/** Called when another user comes online. */
	onJoin?: (user: PresenceState) => void;
	/** Called when another user goes offline. */
	onLeave?: (user: PresenceState) => void;
}) {
	const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
	const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

	// Store callbacks in refs to keep the subscription stable
	const callbacksRef = useRef({ onJoin, onLeave });
	callbacksRef.current = { onJoin, onLeave };

	useEffect(() => {
		const supabase = getSupabaseBrowserClient();
		// Track whether this is the initial sync — don't toast for
		// users who were already online when we connected.
		let initialSyncDone = false;

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

			if (!initialSyncDone) {
				initialSyncDone = true;
			}
		});

		// Join events — fires for each new presence key
		channel.on("presence", { event: "join" }, ({ newPresences }) => {
			if (!initialSyncDone) return;
			for (const raw of newPresences) {
				const p = raw as unknown as PresenceState;
				if (p.userId !== currentUserId) {
					callbacksRef.current.onJoin?.(p);
				}
			}
		});

		// Leave events — fires for each removed presence key
		channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
			for (const raw of leftPresences) {
				const p = raw as unknown as PresenceState;
				if (p.userId !== currentUserId) {
					callbacksRef.current.onLeave?.(p);
				}
			}
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
