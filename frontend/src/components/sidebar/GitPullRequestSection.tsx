import React, { useState } from "react";
import { GitPullRequest, RefreshCw, Send } from "lucide-react";
import type { GitHubPullRequest, GitHubPullRequestReview, GitHubPullRequestState } from "../../types/git";
import type { GitPanelState } from "./gitPanelStateTypes";
import {
  buttonStyle,
  cardStyle,
  inputStyle,
  listStyle,
  metaPillStyle,
  metaStyle,
  primaryButtonStyle,
  rowStyle,
  sectionTitleStyle,
  stackStyle,
  textareaStyle,
  titleStyle
} from "./gitPanelStyles";

interface PullRequestDraft {
  readonly base: string;
  readonly body: string;
  readonly head: string;
  readonly title: string;
  readonly token: string;
}

export function GitPullRequestSection({ state }: { readonly state: GitPanelState }) {
  const [draft, setDraft] = useState<PullRequestDraft>(initialDraft());
  const [pulls, setPulls] = useState<readonly GitHubPullRequest[]>([]);
  const [reviews, setReviews] = useState<Record<number, readonly GitHubPullRequestReview[]>>({});
  const [filter, setFilter] = useState<GitHubPullRequestState>("open");
  const disabled = state.action !== "" || draft.token.trim() === "";

  return (
    <section style={cardStyle}>
      <div style={sectionTitleStyle}>GitHub PR</div>
      <div style={stackStyle}>
        <input onChange={(event) => setDraft({ ...draft, token: event.target.value })} placeholder="GitHub Token" style={inputStyle} type="password" value={draft.token} />
        <div style={rowStyle}>
          <select onChange={(event) => setFilter(event.target.value as GitHubPullRequestState)} style={selectStyle} value={filter}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <button disabled={disabled} onClick={() => void loadPulls(state, draft.token, filter, setPulls)} style={buttonState(buttonStyle, disabled)}>
            <RefreshCw size={12} /> 刷新
          </button>
        </div>
        <PullList pulls={pulls} reviews={reviews} state={state} token={draft.token} onReviews={setReviews} />
        <input onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="PR 标题" style={inputStyle} value={draft.title} />
        <div style={rowStyle}>
          <input onChange={(event) => setDraft({ ...draft, head: event.target.value })} placeholder="head" style={inputStyle} value={draft.head} />
          <input onChange={(event) => setDraft({ ...draft, base: event.target.value })} placeholder="base" style={inputStyle} value={draft.base} />
        </div>
        <textarea onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="PR 描述" style={textareaStyle} value={draft.body} />
        <button disabled={disabled || draft.title.trim() === ""} onClick={() => void createPull(state, draft, setPulls)} style={buttonState(primaryButtonStyle, disabled || draft.title.trim() === "")}>
          <Send size={12} /> 创建 PR
        </button>
      </div>
    </section>
  );
}

function PullList(props: {
  readonly onReviews: (reviews: Record<number, readonly GitHubPullRequestReview[]>) => void;
  readonly pulls: readonly GitHubPullRequest[];
  readonly reviews: Record<number, readonly GitHubPullRequestReview[]>;
  readonly state: GitPanelState;
  readonly token: string;
}) {
  if (props.pulls.length === 0) return <div style={metaStyle}>暂无 PR</div>;

  return (
    <div style={listStyle}>
      {props.pulls.map((pull) => (
        <div key={pull.number} style={stackStyle}>
          <div style={rowStyle}>
            <GitPullRequest color="var(--text-muted)" size={13} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={titleStyle}>#{pull.number} {pull.title}</div>
              <div style={metaStyle}>{pull.headRef} -&gt; {pull.baseRef} · {pull.authorLogin}</div>
            </div>
            <span style={metaPillStyle}>{pull.state}</span>
            <button disabled={props.state.action !== "" || props.token.trim() === ""} onClick={() => void loadReviews(props, pull.number)} style={buttonState(buttonStyle, props.state.action !== "" || props.token.trim() === "")}>
              review
            </button>
          </div>
          <ReviewList reviews={props.reviews[pull.number] ?? []} />
        </div>
      ))}
    </div>
  );
}

function ReviewList(props: { readonly reviews: readonly GitHubPullRequestReview[] }) {
  if (props.reviews.length === 0) return null;
  return (
    <div style={listStyle}>
      {props.reviews.map((review) => (
        <div key={review.id} style={metaStyle}>
          {review.state} · {review.authorLogin}{review.body === "" ? "" : ` · ${review.body}`}
        </div>
      ))}
    </div>
  );
}

async function loadPulls(
  state: GitPanelState,
  token: string,
  filter: GitHubPullRequestState,
  setPulls: (pulls: readonly GitHubPullRequest[]) => void
): Promise<void> {
  await state.run("listPullRequests", async () => {
    const pulls = await window.nexus.git.listPullRequests({ state: filter, token });
    setPulls(pulls);
    return { exitCode: 0, stderr: "", stdout: `加载 ${pulls.length} 个 PR` };
  });
}

async function loadReviews(
  props: Parameters<typeof PullList>[0],
  number: number
): Promise<void> {
  await props.state.run("listPullRequestReviews", async () => {
    const reviews = await window.nexus.git.listPullRequestReviews({ number, token: props.token });
    props.onReviews({ ...props.reviews, [number]: reviews });
    return { exitCode: 0, stderr: "", stdout: `加载 ${reviews.length} 条 review` };
  });
}

async function createPull(
  state: GitPanelState,
  draft: PullRequestDraft,
  setPulls: (updater: (pulls: readonly GitHubPullRequest[]) => readonly GitHubPullRequest[]) => void
): Promise<void> {
  await state.run("createPullRequest", async () => {
    const pull = await window.nexus.git.createPullRequest({
      base: optional(draft.base),
      body: draft.body,
      head: optional(draft.head),
      title: draft.title,
      token: draft.token
    });
    setPulls((pulls) => [pull, ...pulls.filter((item) => item.number !== pull.number)]);
    return pull;
  });
}

function initialDraft(): PullRequestDraft {
  return { base: "main", body: "", head: "", title: "", token: "" };
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function buttonState(style: React.CSSProperties, disabled: boolean): React.CSSProperties {
  return disabled ? { ...style, cursor: "not-allowed", opacity: 0.55 } : style;
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 96
};
