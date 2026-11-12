import { configDefaults, defineConfig } from 'vitest/config';

// Agent worktrees live in .claude/worktrees; their copies of the tests are not ours to run.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, '.claude/**'] } });
