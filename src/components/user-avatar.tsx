import BoringAvatar from "boring-avatars";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const PALETTE = ["#4F46E5", "#7C3AED", "#2563EB", "#0891B2", "#059669"];

type UserAvatarProps = {
	displayName: string;
	avatarUrl?: string | null;
	size?: "default" | "sm" | "lg";
	className?: string;
};

export default function UserAvatar({
	displayName,
	avatarUrl,
	size = "default",
	className,
}: UserAvatarProps) {
	return (
		<Avatar size={size} className={className}>
			{avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
			<AvatarFallback className="p-0">
				<BoringAvatar
					size={size === "sm" ? 24 : size === "lg" ? 40 : 32}
					name={displayName}
					variant="beam"
					colors={PALETTE}
				/>
			</AvatarFallback>
		</Avatar>
	);
}
