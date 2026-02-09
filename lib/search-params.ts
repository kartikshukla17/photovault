export function withSearchParams(
  pathname: string,
  current: { toString(): string },
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

