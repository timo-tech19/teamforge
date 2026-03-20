import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "#/lib/utils";

describe("formatRelativeTime", () => {
	it('returns "just now" for times less than a minute ago', () => {
		const now = new Date().toISOString();
		expect(formatRelativeTime(now)).toBe("just now");
	});

	it("returns minutes for times less than an hour ago", () => {
		const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
		expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
	});

	it("returns hours for times less than a day ago", () => {
		const threeHoursAgo = new Date(
			Date.now() - 3 * 60 * 60 * 1000,
		).toISOString();
		expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
	});

	it("returns days for times less than a week ago", () => {
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000,
		).toISOString();
		expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
	});

	it("returns a formatted date for times more than a week ago", () => {
		const twoWeeksAgo = new Date(
			Date.now() - 14 * 24 * 60 * 60 * 1000,
		).toISOString();
		const result = formatRelativeTime(twoWeeksAgo);
		// Should be a locale date string, not a relative time
		expect(result).not.toContain("ago");
		expect(result).not.toBe("just now");
	});
});
