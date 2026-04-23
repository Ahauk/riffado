export function timeAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (hr < 24) return `hace ${hr} h`;
  if (day === 1) return "ayer";
  if (day < 7) return `hace ${day} d`;
  const weeks = Math.floor(day / 7);
  if (weeks < 4) return `hace ${weeks} sem`;
  return new Date(ts).toLocaleDateString();
}
