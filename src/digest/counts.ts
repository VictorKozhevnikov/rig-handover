import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';
import type { RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

// Parsed run lines per status; bad lines are not counted. Zeros when the night is missing.
export function countStatuses(runsDir: string, night: string): StatusCounts {
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return counts;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return counts;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line) counts[line.status]++;
  }
  return counts;
}
