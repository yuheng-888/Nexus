export interface ShellRevealResult {
  readonly path: string;
  readonly success: boolean;
}

export interface NexusShellApi {
  revealPath(path: string): Promise<ShellRevealResult>;
}
