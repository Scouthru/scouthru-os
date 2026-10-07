export function cn(...xs: (string | number | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
