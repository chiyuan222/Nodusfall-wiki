export function extractFirstImage(content: string): string | null {
  const md = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
  if (md?.[1]) return md[1];
  const html = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return html?.[1] ?? null;
}
