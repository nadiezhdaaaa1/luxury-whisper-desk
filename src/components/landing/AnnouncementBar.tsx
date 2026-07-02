import { ArrowRight } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="w-full bg-champagne-soft/60 border-b border-hairline">
      <div className="container-page py-2 flex items-center justify-center text-center">
        <p className="text-xs sm:text-[13px] text-foreground/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-champagne mr-2 align-middle" />
          Now tracking watches &amp; jewelry — bags coming soon.{" "}
          <a href="/start" className="font-semibold text-foreground inline-flex items-center gap-1 hover:text-champagne transition-colors">
            Start free <ArrowRight className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
