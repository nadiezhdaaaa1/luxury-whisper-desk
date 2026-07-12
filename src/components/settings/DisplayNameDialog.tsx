import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  userId: string;
  onSaved: (newName: string) => void;
};

export function DisplayNameDialog({ open, onOpenChange, currentName, userId, onSaved }: Props) {
  const [value, setValue] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const trimmed = value.trim();
  const invalid = trimmed.length < 2 || trimmed.length > 60;

  async function handleSave() {
    if (invalid) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed } as never)
        .eq("id", userId);
      if (error) throw error;
      track("display_name_updated", {});
      toast.success("Display name updated");
      onSaved(trimmed);
      onOpenChange(false);
    } catch (e) {
      console.error("[display_name] failed", e);
      toast.error("Couldn't update name", { description: "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit display name</DialogTitle>
          <DialogDescription>
            This is how we address you in the app and in emails.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="dn">Display name</Label>
          <Input
            id="dn"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={60}
            placeholder="Your name"
          />
          <p className="text-xs text-muted-foreground">
            {trimmed.length}/60 characters · minimum 2
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy || invalid} className="rounded-full">
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
