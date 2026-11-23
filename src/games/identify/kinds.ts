export type IdentifyKind = 'silhouette' | 'cry';

export interface KindInfo {
  kind: IdentifyKind;
  path: string;
}

/** Titles and intros live in the dictionaries (`mode.<kind>.title`, `id.intro.<kind>`). */
export const KINDS: Record<IdentifyKind, KindInfo> = {
  silhouette: { kind: 'silhouette', path: '/silhouette' },
  cry: { kind: 'cry', path: '/cry' },
};
