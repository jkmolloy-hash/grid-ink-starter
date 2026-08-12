import { BRAND, TURNAROUND } from "@/config";
import { NibMark } from "@/components/NibMark";

export default function Footer() {
  return (
    <footer className="bg-paper border-t border-ink/10 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row
                      items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <NibMark className="w-9 text-ink/60" />
          <div>
          <div className="font-display font-bold">{BRAND.name}</div>
          <div className="caption mt-1">
            Every piece drawn by a real pen &middot; {TURNAROUND}
          </div>
          </div>
        </div>
        <div className="caption">
          &copy; {new Date().getFullYear()} Grid &amp; Ink Co. &middot; Austin, TX
        </div>
      </div>
    </footer>
  );
}
