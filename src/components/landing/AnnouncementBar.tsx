import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function AnnouncementBar() {
  return (
    <div className="w-full bg-surface-3">
      <div className="container-page py-2 flex items-center justify-center text-center">
        <p className="text-xs sm:text-[13px] text-foreground/90">
          Now tracking watches, jewelry &amp; bags.{" "}
          <Link
            to="/quiz"
            className="font-semibold text-foreground inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            Get started <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
