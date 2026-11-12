// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One line of runs/<night>.jsonl, after parsing. */
export type RunLine = {
  at: string; // ISO 8601 with the log's own offset; never converted
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job in a night. */
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one
  firstAt: string; // offset kept as logged
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
};

/** null when runs/<night>.jsonl does not exist (→ 404). An empty file gives rows: []. */
export type ReadNight = (runsDir: string, night: string) => Night | null;
