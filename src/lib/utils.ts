// src/lib/utils.ts
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
