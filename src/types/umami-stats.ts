/** Different Umami API versions may return either a raw number or { value: number } */
type UmamiValue = { value: number } | number;

export interface UmamiSessionStats {
  pageviews: UmamiValue;
  visitors?: UmamiValue;
  visits?: UmamiValue;
  bounces?: UmamiValue;
  totaltime?: UmamiValue;
  [key: string]: unknown;
}

export interface UmamiStatsConfig {
  baseUrl: string;
  websiteId: string;
  /** Umami share slug, exchanged for a short-lived JWT at runtime (safe to expose on client) */
  shareToken: string;
  path?: string;
  startAt?: number;
  endAt?: number;
}

export interface UmamiStatsSummary {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export interface UmamiDataPoint {
  x: string;
  y: number;
}

export interface UmamiPageviewSeries {
  pageviews: UmamiDataPoint[];
  sessions: UmamiDataPoint[];
}

export type UmamiMetricType =
  | 'path'
  | 'entry'
  | 'exit'
  | 'title'
  | 'query'
  | 'referrer'
  | 'channel'
  | 'domain'
  | 'country'
  | 'region'
  | 'city'
  | 'browser'
  | 'os'
  | 'device'
  | 'language'
  | 'screen'
  | 'event'
  | 'hostname'
  | 'tag'
  | 'distinctId';

export interface UmamiMetricRow {
  x: string;
  y: number;
}

export interface UmamiExpandedMetricRow {
  name: string;
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}
