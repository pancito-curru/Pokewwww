export type IdentifyKind = 'silhouette' | 'cry';

export interface KindInfo {
  kind: IdentifyKind;
  path: string;
  title: string;
  /** What the player is shown, for copy like "Identify the ___". */
  noun: string;
  intro: string;
}

export const KINDS: Record<IdentifyKind, KindInfo> = {
  silhouette: {
    kind: 'silhouette',
    path: '/silhouette',
    title: 'Silhouettes',
    noun: 'silhouette',
    intro: 'Name the Pokémon from its shadow. You get 3 tries for each one.',
  },
  cry: {
    kind: 'cry',
    path: '/cry',
    title: 'Cries',
    noun: 'cry',
    intro: 'Listen to a Pokémon’s cry and name it. Replay it as often as you like; you get 3 tries for each one.',
  },
};
