export type BlockSummary = {
  id: string;
  start: string;
  end: string;
  synced: boolean;
};

export type BlockView = BlockSummary & {
  taskId: string;
  title: string;
  color: string;
  /** The set of hours it belongs to ("Study"), so color is never the only cue. */
  category: string | null;
};

export type TaskView = {
  id: string;
  title: string;
  notes: string | null;
  deadline: string;
  durationMinutes: number;
  priority: number;
  status: string;
  shortfallMinutes: number;
  profile: { id: string; name: string; color: string } | null;
  blocks: BlockSummary[];
};

export type ProfileOption = {
  id: string;
  name: string;
  color: string;
  defaultMinBlockMinutes: number;
  defaultMaxBlockMinutes: number;
};
