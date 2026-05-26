import type { SubagentProfile } from "../contracts.js";

interface ProfileDefinition extends SubagentProfile {
  readonly instructions: string;
}

const PROFILES: readonly ProfileDefinition[] = [
  {
    description: "拆解任务、找风险、给出执行顺序",
    id: "planner",
    instructions: "Focus on task decomposition, dependencies, risks, and verification steps.",
    name: "规划子代理"
  },
  {
    description: "实现小范围代码改动并保持输出可验证",
    id: "implementer",
    instructions: "Focus on implementation. Keep changes scoped and report files changed.",
    name: "实现子代理"
  },
  {
    description: "审查缺陷、回归风险和遗漏测试",
    id: "reviewer",
    instructions: "Focus on bugs, regressions, missing tests, and exact file references.",
    name: "审查子代理"
  },
  {
    description: "运行验证、定位失败并输出复现证据",
    id: "verifier",
    instructions: "Focus on reproducible verification, failing commands, and clear evidence.",
    name: "验证子代理"
  }
];

export function getSubagentProfiles(): readonly SubagentProfile[] {
  return PROFILES.map(({ description, id, name }) => ({ description, id, name }));
}

export function buildSubagentPrompt(profileId: string | undefined, prompt: string): {
  readonly profile: SubagentProfile;
  readonly prompt: string;
} {
  const profile = getProfile(profileId);
  return {
    profile: toPublicProfile(profile),
    prompt: [
      `You are ${profile.name}, a Nexus IDE native subagent.`,
      profile.instructions,
      "Work independently, keep output concise, and surface blockers explicitly.",
      "",
      "Task:",
      prompt.trim()
    ].join("\n")
  };
}

function getProfile(profileId: string | undefined): ProfileDefinition {
  return PROFILES.find((profile) => profile.id === profileId) ?? PROFILES[1];
}

function toPublicProfile(profile: ProfileDefinition): SubagentProfile {
  return {
    description: profile.description,
    id: profile.id,
    name: profile.name
  };
}
