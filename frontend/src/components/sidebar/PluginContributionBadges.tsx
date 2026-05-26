import React from "react";
import type { PluginContributionSummary } from "../../types/nexus";
import { pluginContributionBadges } from "./pluginContributionModel";

interface PluginContributionBadgesProps {
  readonly contributions: PluginContributionSummary | undefined;
}

export function PluginContributionBadges({ contributions }: PluginContributionBadgesProps) {
  const badges = pluginContributionBadges(contributions);
  if (badges.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          style={{
            background: "var(--bg-badge)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: 10,
            lineHeight: "16px",
            padding: "0 5px"
          }}
        >
          {badge.label} {badge.value}
        </span>
      ))}
    </div>
  );
}
