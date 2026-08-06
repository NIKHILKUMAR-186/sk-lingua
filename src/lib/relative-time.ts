/**
 * Converts a date string into a human-readable relative time string.
 * Shows "Today", "Yesterday", or a date for older notifications.
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Less than 1 minute
  if (diffSeconds < 60) {
    return "Just now";
  }

  // Less than 60 minutes
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  // Less than 24 hours
  if (diffHours < 24) {
    // Check if it was today
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      return `${diffHours}h ago`;
    }
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
    if (isYesterday) {
      return "Yesterday";
    }
    return `${diffDays}d ago`;
  }

  // 1-6 days ago
  if (diffDays < 7) {
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  }

  // Same year: show "Jul 24"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Different year: show "Jul 24, 2026"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
