// Dev-only test panel. Not a product surface: nothing links here, it is
// noindex, the component renders nothing outside a development build, and
// every server function it calls refuses unless `isDevBuild()` is true.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDevBuild } from "@/lib/dev-only";
import { getAccessState } from "@/lib/access.functions";
import {
  devProvisionThrowaway,
  devSetCredentials,
  devSetOnboarded,
  devSetSubscription,
  devWipeAccount,
  type Period,
  type SubState,
} from "@/lib/dev-test-panel.functions";

export const Route = createFileRoute("/dev/test-panel")({
  head: () => ({
    meta: [{ title: "Dev test panel" }, { name: "robots", content: "noindex" }],
  }),
  component: DevTestPanel,
});

const PERIODS: Period[] = ["monthly", "quarterly", "annual"];

function DevTestPanel() {
  // Renders nothing at all in a production build.
  if (!isDevBuild()) return null;
  return <Panel />;
}

function Panel() {
  const provision = useServerFn(devProvisionThrowaway);
  const setCredentials = useServerFn(devSetCredentials);
  const setOnboarded = useServerFn(devSetOnboarded);
  const setSubscription = useServerFn(devSetSubscription);
  const wipe = useServerFn(devWipeAccount);

  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<Period>("monthly");
  const [wipeEmail, setWipeEmail] = useState("");
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [me, setMe] = useState<{ email: string | null; id: string | null }>({
    email: null,
    id: null,
  });

  const access = useQuery({
    queryKey: ["dev-panel-access"],
    queryFn: () => getAccessState(),
    retry: false,
  });

  const refreshMe = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setMe({ email: data.user?.email ?? null, id: data.user?.id ?? null });
    await access.refetch();
  }, [access]);

  useEffect(() => {
    void refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 20));

  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        const out = await fn();
        say(`${label} → ${typeof out === "object" ? JSON.stringify(out) : String(out)}`);
      } catch (e) {
        say(`${label} → error: ${e instanceof Error ? e.message : "failed"}`);
      } finally {
        setBusy(false);
        await refreshMe();
      }
    },
    [refreshMe],
  );

  const provisionAndSignIn = () =>
    run("provision throwaway", async () => {
      const res = await provision({ data: undefined });
      const { error } = await supabase.auth.verifyOtp({
        token_hash: res.tokenHash,
        type: "magiclink",
      });
      if (error) throw new Error(error.message);
      setWipeEmail(res.email);
      return { email: res.email, userId: res.userId, signedIn: true };
    });

  const subButtons: { label: string; state: SubState }[] = [
    { label: "Subscription: none", state: "none" },
    { label: "Subscription: active", state: "active" },
    { label: "Cancelled (voluntary)", state: "canceled_voluntary" },
    { label: "Cancelled after failed payment", state: "canceled_past_due" },
  ];

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-hairline bg-surface p-4 text-sm">
          <span className="eyebrow">Dev only</span>
          <h1 className="mt-2 font-display text-xl font-medium text-foreground">
            Account &amp; payment flow test panel
          </h1>
          <p className="mt-1 text-muted-foreground">
            Signed in as <code>{me.email ?? "nobody"}</code>
            {me.id ? (
              <>
                {" "}
                · <code>{me.id}</code>
              </>
            ) : null}
          </p>
        </div>

        <Section title="1 · Throwaway account">
          <button className="btn-primary text-sm min-h-11" disabled={busy} onClick={provisionAndSignIn}>
            Create confirmed account + sign in
          </button>
          <button
            className="btn-tertiary text-sm min-h-11"
            disabled={busy}
            onClick={() =>
              run("sign out", async () => {
                await supabase.auth.signOut();
                return { signedOut: true };
              })
            }
          >
            Sign out
          </button>
        </Section>

        <Section title="2 · Gate state (current account)">
          <button
            className="btn-secondary text-sm min-h-11"
            disabled={busy || !me.id}
            onClick={() => run("credentials: present", () => setCredentials({ data: { present: true } }))}
          >
            Credentials: present
          </button>
          <button
            className="btn-secondary text-sm min-h-11"
            disabled={busy || !me.id}
            onClick={() => run("credentials: absent", () => setCredentials({ data: { present: false } }))}
          >
            Credentials: absent
          </button>
          <button
            className="btn-secondary text-sm min-h-11"
            disabled={busy || !me.id}
            onClick={() => run("onboarded: yes", () => setOnboarded({ data: { onboarded: true } }))}
          >
            Onboarded: yes (with seed answers)
          </button>
          <button
            className="btn-secondary text-sm min-h-11"
            disabled={busy || !me.id}
            onClick={() => run("onboarded: no", () => setOnboarded({ data: { onboarded: false } }))}
          >
            Onboarded: no
          </button>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Period:</span>
            {PERIODS.map((p) => (
              <button
                key={p}
                className={p === period ? "btn-primary text-xs min-h-9" : "btn-tertiary text-xs min-h-9"}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {subButtons.map((b) => (
            <button
              key={b.state}
              className="btn-secondary text-sm min-h-11"
              disabled={busy || !me.id}
              onClick={() => run(b.label, () => setSubscription({ data: { state: b.state, period } }))}
            >
              {b.label}
            </button>
          ))}
        </Section>

        <Section title="3 · Hard wipe one account">
          <p className="text-xs text-muted-foreground">
            Generated <code>dev+…@example.test</code> addresses wipe directly. Any other address
            must be retyped in full in the confirm field. Only the single resolved account is
            touched.
          </p>
          <input
            className="input-field text-sm"
            placeholder="email to wipe"
            value={wipeEmail}
            onChange={(e) => setWipeEmail(e.target.value)}
          />
          <input
            className="input-field text-sm"
            placeholder="confirm (retype in full for non-throwaway)"
            value={wipeConfirm}
            onChange={(e) => setWipeConfirm(e.target.value)}
          />
          <button
            className="btn-secondary text-sm min-h-11"
            disabled={busy || !wipeEmail}
            onClick={() =>
              run("wipe", async () => {
                const res = await wipe({ data: { email: wipeEmail, confirm: wipeConfirm } });
                if (res.userId === me.id) await supabase.auth.signOut();
                return res;
              })
            }
          >
            Delete account and all its rows
          </button>
        </Section>

        <Section title="4 · Server-computed access state">
          <pre className="overflow-x-auto rounded-xl border border-hairline bg-surface p-4 text-xs text-muted-foreground">
            {access.isError
              ? `error: ${access.error instanceof Error ? access.error.message : "failed"}`
              : JSON.stringify(access.data ?? null, null, 2)}
          </pre>
          <button className="btn-tertiary text-sm min-h-11" onClick={() => void refreshMe()}>
            Refresh
          </button>
        </Section>

        {log.length > 0 ? (
          <pre className="overflow-x-auto rounded-xl border border-hairline bg-surface p-4 text-xs text-muted-foreground">
            {log.join("\n")}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-4">
      <h2 className="font-display font-medium text-foreground">{title}</h2>
      {children}
    </div>
  );
}
