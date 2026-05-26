export interface ShellRevealResult {
  readonly path: string;
  readonly success: boolean;
}

export interface ShellApi {
  revealPath(path: string): Promise<ShellRevealResult>;
}
