/**
 * Shared top-level header for the three main tabs (Home/Status/Review) —
 * a symmetric flex row with equal-width spacers on both sides, the same
 * true-centering technique already used by every sub-page's back-button
 * header, so the title sits on the actual viewport center regardless of
 * safe-area insets rather than being centered only within its own text box.
 */
export function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center justify-between py-2">
      <div className="w-8" aria-hidden />
      <h1 className="text-[17px] font-semibold">{title}</h1>
      <div className="w-8" aria-hidden />
    </div>
  );
}
