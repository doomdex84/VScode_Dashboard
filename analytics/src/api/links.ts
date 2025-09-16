// analytics/src/api/links.ts
import { api } from "./http";

export type Link = {
  id: number; slug: string; originalUrl: string;
  expirationDate: string | null; active: boolean; createdAt: string;
};

export type LogItem = {
  id: number; linkId: number; ipHash?: string; referrer?: string | null;
  channel?: string | null; deviceType?: string | null; os?: string | null;
  browser?: string | null; userAgent?: string | null; clickedAt: string;
};

export type KV = { key: string; cnt: number };
export type BrowserItem = { browser: string; cnt: number };
export type TimeGranularity = "hour" | "dow" | "month";
export type TimeBucket = { bucket: string; cnt: number };

export type Stats = {
  totalClicks: number;
  clicksLast24hByHour: { hour: string; cnt: number }[];
  clicksLast7dByDate: { date: string; cnt: number }[];
  topReferrers: { host: string; cnt: number }[];
  topBrowsers: { browser: string; cnt: number }[];
  topOS: { os: string; cnt: number }[];
};

export type UniqueStats = {
  totalClicks: number; uniqueApprox: number; duplicateRatio: number;
  uniqueWindowed: number; windowMinutes: number;
};

// ---- endpoints ----
export const getLink             = (slug: string) => api.get<Link>(`/links/${slug}`);
export const getLinkLogs         = (slug: string) => api.get<LogItem[]>(`/links/${slug}/logs`);
export const getLinkFull         = (slug: string) => api.get<{ link: Link; stats: Stats }>(`/links/${slug}/full`);
export const getLinkStats        = (slug: string) => api.get<Stats>(`/links/${slug}/stats`);
export const getLinkBrowsers     = (slug: string) => api.get<BrowserItem[]>(`/links/${slug}/browsers`);
export const getTimeDistribution = (slug: string, g: TimeGranularity) =>
  api.get<TimeBucket[]>(`/links/${slug}/time-distribution?granularity=${g}`);
export const getLinkBurst        = (slug: string) => api.get<{ totalClicks: number; halflifeHours: number; byHourSinceCreate: TimeBucket[]; cumulative: number[] }>(`/links/${slug}/burst`);
export const getReexpose         = (slug: string, atISO: string, windowHours = 24) =>
  api.get<{ windowHours: number; beforeTotal: number; afterTotal: number; beforeSeries: TimeBucket[]; afterSeries: TimeBucket[] }>(
    `/links/${slug}/reexpose?at=${encodeURIComponent(atISO)}&windowHours=${windowHours}`
  );
export const getReferrers        = (slug: string) => api.get<KV[]>(`/links/${slug}/referrers`);
export const getChannels         = (slug: string) => api.get<KV[]>(`/links/${slug}/channels`);
export const getTargetsReferrers = (url: string) => api.get<KV[]>(`/targets/referrers?url=${encodeURIComponent(url)}`);
export const getUniqueStats      = (slug: string) => api.get<UniqueStats>(`/links/${slug}/unique-stats`);
