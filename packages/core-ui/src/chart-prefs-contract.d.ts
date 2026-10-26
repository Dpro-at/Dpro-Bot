export type ChartPrefs = { view: 'list' | 'chart'; mode: 'reports' | 'departments'; lines: 'elbow' | 'curved' | 'straight'; zoom: number; folded: string[] };
export const CHART_PREFS_PATH: '/api/me/agents-chart';
export const DEFAULT_CHART: Readonly<ChartPrefs>;
export function chartChangeOk(x: unknown): x is Partial<ChartPrefs>;
export function chartPrefs(x: unknown): ChartPrefs;
export function chartPrefsRoute(path: string): boolean;
export function allowedChartPrefs(method: string, path: string, body?: unknown): boolean;
export function chartPrefsResponse(status: number, body: unknown): { chart: ChartPrefs } | { code: string };
