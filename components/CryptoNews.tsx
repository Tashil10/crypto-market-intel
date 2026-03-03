type NewsItem = {
  title: string;
  url: string;
  description?: string;
  source?: string;
  date?: string;
};

export default function CryptoNews({ items = [] }: { items: NewsItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-theme">Crypto news</h3>
        <p className="mt-2 text-base text-zinc-500">No news loaded.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <h3 className="text-sm font-medium uppercase tracking-wider text-theme">Crypto news</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item, i) => {
          const hasValidUrl = typeof item.url === "string" && item.url.trim() !== "" && item.url !== "#";
          return (
          <li key={i} className="border-b border-zinc-800/60 pb-3 last:border-0 last:pb-0">
            {hasValidUrl ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base text-theme hover:text-theme-muted transition leading-snug"
              >
                {item.title}
              </a>
            ) : (
              <span className="block text-base text-theme cursor-default select-none">
                {item.title}
              </span>
            )}
            {item.description && (
              <p className="mt-1 text-sm leading-relaxed text-zinc-500 line-clamp-2">{item.description}</p>
            )}
            <p className="mt-1 text-sm text-zinc-500">
              {[item.source, item.date ? new Date(item.date).toLocaleDateString() : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
