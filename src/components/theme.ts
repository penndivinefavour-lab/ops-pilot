export interface NavTheme {
  accentColor: string;
}

export function setTheme(theme: NavTheme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nav-theme', JSON.stringify(theme));
}

export function getTheme(): NavTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('nav-theme');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
