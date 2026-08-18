import { ArrowRight } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="w-full bg-primary border-b border-primary">
      <div className="container-page py-2 flex items-center justify-center text-center">
        <p className="text-xs sm:text-[13px] text-primary-foreground/90">
          Now tracking watches, jewelry &amp; bags.{" "}
          <a
            href="/quiz"
            className="font-semibold text-primary-foreground inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            Start free <ArrowRight className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
