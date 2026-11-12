import { expect, it } from 'vitest';
import { countStatuses } from '../src/digest/counts.js';

it('counts parsed run lines per status, skipping the truncated one', () => {
  expect(countStatuses('runs', '2026-10-28')).toEqual({ ok: 10, retry: 4, fail: 1 });
});
