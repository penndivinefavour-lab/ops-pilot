import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { NavTheme } from './theme';

export async function saveTheme(theme: NavTheme): Promise<void> {
  const data = JSON.stringify(theme, null, 2);
  const path = join(process.cwd(), 'public', 'theme.json');
  await writeFile(path, data, 'utf-8');
}

export async function loadTheme(): Promise<NavTheme | null> {
  try {
    const data = await readFile(join(process.cwd(), 'public', 'theme.json'), 'utf-8');
    return JSON.parse(data) as NavTheme;
  } catch {
    return null;
  }
}
