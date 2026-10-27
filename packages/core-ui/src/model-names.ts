/**
 * A model id as the owner reads it: "claude-sonnet-4-5-20250929" → "Claude Sonnet 4.5",
 * "qwen3:8b" → "Qwen3 8B". Unknown ids lose their date stamp and dashes.
 */
export function modelDisplayName(id: string | null | undefined): string {
  const raw = (id ?? '').trim();
  if (!raw) return '';
  const cap = (w: string) => w ? w[0].toUpperCase() + w.slice(1) : w;
  const family = /^claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/i.exec(raw);
  if (family) return `Claude ${cap(family[1].toLowerCase())} ${family[2]}${family[3] ? '.' + family[3] : ''}`;
  const older = /^claude-(\d)(?:-(\d))?-(opus|sonnet|haiku)(?:-\d{8})?$/i.exec(raw);
  if (older) return `Claude ${cap(older[3].toLowerCase())} ${older[1]}${older[2] ? '.' + older[2] : ''}`;
  if (/^gpt-/i.test(raw)) return 'GPT-' + raw.slice(4).replace(/-\d{4}-\d{2}-\d{2}$/, '');
  const [name, tag] = raw.split(':');
  const words = name.replace(/-\d{8}$/, '').split(/[-_]/).filter(Boolean).map(cap).join(' ');
  return tag && tag !== 'latest' ? `${words} ${tag.toUpperCase()}` : words;
}
