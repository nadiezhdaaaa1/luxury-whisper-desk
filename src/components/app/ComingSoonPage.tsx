// Shared layout for the in-development ("Soon") pages. One copy, rendered by
// /app/analytics and /app/digests. Design: Figma 425:973.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import comingSoonImg from "@/assets/coming-soon.webp";
import { track } from "@/lib/analytics";
import {
  submitFeatureVote,
  getMyFeatureVote,
  type FeatureVoteValue,
} from "@/lib/feature-votes.functions";

type Props = {
  /** Same on every "Soon" page; overridable but defaults to the comp's wording. */
  title?: string;
  description: string;
  feature: string;
};

export function ComingSoonPage({ title = "Still in development", description, feature }: Props) {
  const queryClient = useQueryClient();
  const readVote = useServerFn(getMyFeatureVote);
  const sendVote = useServerFn(submitFeatureVote);

  const [optimistic, setOptimistic] = useState<FeatureVoteValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("coming_soon_view", { feature });
  }, [feature]);

  const { data } = useQuery({
    queryKey: ["feature-vote", feature],
    queryFn: () => readVote({ data: { feature } }),
  });

  const mutation = useMutation({
    mutationFn: (vote: FeatureVoteValue) => sendVote({ data: { feature, vote } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-vote", feature] });
    },
    onError: () => {
      setOptimistic(null);
      setError("Couldn't save your answer. Please try again.");
    },
  });

  const selected = optimistic ?? data?.vote ?? null;

  function vote(next: FeatureVoteValue) {
    setError(null);
    setOptimistic(next);
    track("coming_soon_vote", { feature, vote: next });
    mutation.mutate(next);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-hairline bg-card p-8 shadow-[var(--shadow-card)]">
      <h2 className="max-w-[480px] font-display text-2xl leading-8 tracking-[-0.6px] text-foreground">
        {title}
      </h2>
      <p className="max-w-[480px] pt-2 text-sm leading-5 text-muted-foreground">{description}</p>

      <div className="flex items-center gap-2 pt-4">
        <button
          type="button"
          aria-pressed={selected === "up"}
          onClick={() => vote("up")}
          className={`${selected === "up" ? "btn-primary" : "btn-secondary"} gap-2 px-5`}
        >
          <ThumbsUp className="h-5 w-5" aria-hidden="true" />I need this
        </button>
        <button
          type="button"
          aria-label="I don't need this"
          aria-pressed={selected === "down"}
          onClick={() => vote("down")}
          className={`${selected === "down" ? "btn-primary" : "btn-secondary"} px-5`}
        >
          <ThumbsDown className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link
          to="/contact"
          search={{ topic: "feature" }}
          className="btn-tertiary px-[22px] font-semibold text-foreground"
        >
          Request another feature
        </Link>
      </div>

      {error ? <p className="pt-3 text-sm text-destructive">{error}</p> : null}

      <img
        src={comingSoonImg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[-88px] top-1/2 hidden h-[280px] w-[280px] -translate-y-1/2 object-cover lg:block"
      />
    </div>
  );
}
