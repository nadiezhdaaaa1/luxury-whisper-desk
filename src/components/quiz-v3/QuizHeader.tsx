// Shared header for the public quiz flow surfaces (quiz steps, A-ha, plans).
// Logo on the left, CLOSE control on the right — identical to /login.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function QuizHeader({ confirmOnClose = true }: { confirmOnClose?: boolean }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function leave() {
    void navigate({ to: "/" });
  }

  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 pt-8">
        <div className="flex h-11 items-center justify-between">
          <Logo className="text-[28px]" />
          <button
            type="button"
            onClick={() => (confirmOnClose ? setConfirmOpen(true) : leave())}
            className="inline-flex items-center gap-1 text-foreground"
            aria-label="Close and go to home page"
          >
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.6px] leading-none">
              Close
            </span>
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          className="max-w-md"
          onEscapeKeyDown={(e) => {
            // Escape resolves as "keep going" — never as "leave".
            e.preventDefault();
            setConfirmOpen(false);
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Leave setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your picks are saved on this device — you can come back and finish.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={leave}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Leave
            </AlertDialogAction>
            <AlertDialogCancel autoFocus>Keep going</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
