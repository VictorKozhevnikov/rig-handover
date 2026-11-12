import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

let dir: string;
let app: ReturnType<typeof createApp>;

const line = (job: string, status: string, at: string) =>
  JSON.stringify({ at, job, status, owner: 'ana' });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(
    join(dir, '2026-11-01.jsonl'),
    [
      line('zeta-sync', 'ok', '2026-11-01T02:00:00+01:00'),
      line('alpha-backup', 'retry', '2026-11-01T01:00:00+01:00'),
      line('alpha-backup', 'ok', '2026-11-01T01:05:00+01:00'),
      line('mid-report', 'fail', '2026-11-01T03:00:00+01:00'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-11-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-11-03.jsonl'),
    [
      line('b-job', 'ok', '2026-11-03T01:00:00+01:00'),
      'not json at all',
      line('a-job', 'ok', '2026-11-03T02:00:00+01:00'),
    ].join('\n') + '\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('GET /digest/:night', () => {
  it('renders a normal night with rows sorted by job', async () => {
    const res = await app.request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    const a = html.indexOf('alpha-backup');
    const m = html.indexOf('mid-report');
    const z = html.indexOf('zeta-sync');
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(m);
    expect(m).toBeLessThan(z);
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-11-09')).status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders 200 with a bad line', async () => {
    const res = await app.request('/digest/2026-11-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a-job');
    expect(html).toContain('b-job');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as JSON', async () => {
    const res = await app.request('/api/digest/2026-11-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-11-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
  });

  it('404 with a JSON error for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-11-09');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night', night: '2026-11-09' });
  });

  it('empty night has no rows', async () => {
    const res = await app.request('/api/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-11-02', rows: [], badLines: 0 });
  });

  it('counts a bad line', async () => {
    const res = await app.request('/api/digest/2026-11-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['a-job', 'b-job']);
  });
});

describe('page and JSON agree', () => {
  it('lists jobs in the same order', async () => {
    const night = '2026-11-01';
    const json = (await (await app.request(`/api/digest/${night}`)).json()) as Night;
    const html = await (await app.request(`/digest/${night}`)).text();
    const positions = json.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
  });
});
