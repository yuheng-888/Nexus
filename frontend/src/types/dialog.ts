export type DialogPathPickMode = "directory" | "file" | "file-or-directory" | "save-file";

export interface DialogPathFilter {
  readonly extensions: readonly string[];
  readonly name: string;
}

export interface DialogPathPickRequest {
  readonly buttonLabel?: string;
  readonly defaultPath?: string;
  readonly filters?: readonly DialogPathFilter[];
  readonly mode: DialogPathPickMode;
  readonly title?: string;
}

export interface DialogPathPickResult {
  readonly canceled: boolean;
  readonly path: string | null;
}

export interface DialogApi {
  pickPath(request: DialogPathPickRequest): Promise<DialogPathPickResult>;
}
