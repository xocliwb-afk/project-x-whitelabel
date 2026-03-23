export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border pt-6 text-sm text-text-muted">
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-text-main">Project X Realty</div>
        <div className="text-text-secondary">Helping you find the right place to call home.</div>
        <div className="flex flex-wrap gap-3 text-xs text-text-main/80">
          <a href="/search" className="hover:underline">
            Search
          </a>
        </div>
        <div className="text-[11px] text-text-secondary">
          Information provided is deemed reliable but not guaranteed. Please verify all details independently.
        </div>
      </div>
    </footer>
  );
}
