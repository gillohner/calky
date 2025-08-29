// src/services/calendar.ts
"use client";

import { initPubkyClient } from "./pubky";

// Stable, lower-case app root under /pub
const APP_ROOT = "/pub/calky"; // do not change casing for on-disk layout

// Types for props and index
export interface CalendarProps {
  id: string; // UUID
  displayName: string;
  color?: string; // e.g. #FF0000
  timezone?: string; // IANA tz string
  ctag: string; // collection tag e.g. v1, v2
  readOnly?: boolean;
  owner?: string; // owner pubkey z32
  description?: string;
  method?: string; // iCalendar method (REQUEST, PUBLISH, etc.)
  calscale?: string; // Calendar scale (GREGORIAN)
}

export interface CalendarIndexEntry {
  id: string; // UUID
  href: string; // path to collection e.g. /pub/calky/cal/<uuid>/
  displayName: string;
  color?: string;
  readOnly?: boolean;
}

export interface CalendarIndex {
  calendars: CalendarIndexEntry[];
}

// RFC 2445 compliant event creation
export interface NewEventInput {
  summary: string; // REQUIRED
  description?: string;
  location?: string;
  start: Date; // local Date, we'll serialize as UTC Z
  end: Date; // must be > start
  // RFC 2445 additional properties
  categories?: string[]; // Event categories
  class?: "PUBLIC" | "PRIVATE" | "CONFIDENTIAL"; // Access classification
  status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED"; // Event status
  transp?: "OPAQUE" | "TRANSPARENT"; // Time transparency
  priority?: number; // Priority 0-9
  sequence?: number; // Revision sequence number
  // Recurrence properties
  rrule?: string; // Recurrence rule
  exdate?: Date[]; // Exception dates
  // Attendee/Organizer properties
  organizer?: {
    email: string;
    cn?: string; // Common name
    sentBy?: string;
  };
  attendees?: Array<{
    email: string;
    cn?: string; // Common name
    role?: "CHAIR" | "REQ-PARTICIPANT" | "OPT-PARTICIPANT" | "NON-PARTICIPANT";
    partstat?:
      | "NEEDS-ACTION"
      | "ACCEPTED"
      | "DECLINED"
      | "TENTATIVE"
      | "DELEGATED";
    rsvp?: boolean;
  }>;
  // Alarm properties
  alarms?: Array<{
    action: "DISPLAY" | "AUDIO" | "EMAIL";
    trigger: string; // e.g., "-PT15M" for 15 minutes before
    description?: string;
    repeat?: number;
    duration?: string;
  }>;
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  created: Date;
  lastModified: Date;
  dtstamp: Date;
  sequence: number;
  status?: string;
  categories?: string[];
  priority?: number;
  class?: string;
  organizer?: {
    email: string;
    cn?: string;
  };
  attendees?: Array<{
    email: string;
    cn?: string;
    role?: string;
    partstat?: string;
    rsvp?: boolean;
  }>;
  raw: string; // full VEVENT block text
}

// Build pubky URL for the current user
function pkUrl(pubkey: string, relPath: string) {
  const normalized = relPath.startsWith("/") ? relPath : `/${relPath}`;
  return `pubky://${pubkey}${normalized}`;
}

// Convenience file paths
function paths(pubkey: string, calendarId?: string) {
  const root = `${APP_ROOT}`;
  const index = `${root}/index.json`;
  if (!calendarId) return { root, index };
  const col = `${root}/cal/${calendarId}`;
  return {
    root,
    index,
    collection: `${col}/`,
    props: `${col}/props.json`,
    ics: `${col}/calendar.ics`,
    etag: `${col}/etag.txt`,
    items: `${col}/items/`,
  };
}

// Wrapper around client.fetch with sane defaults
async function pkFetch(url: string, init?: RequestInit) {
  const client = await initPubkyClient();
  return client.fetch(url, {
    credentials: "include",
    ...(init || {}),
  });
}

// Add cache-busting to all GETs to avoid Nexus stale responses
function withCacheBust(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
}

async function readText(
  url: string
): Promise<{ ok: boolean; status: number; text?: string }> {
  const res = await pkFetch(withCacheBust(url), {
    method: "GET",
    headers: new Headers({ "Cache-Control": "no-cache" }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const text = await res.text();
  return { ok: true, status: res.status, text };
}

async function readJson<T>(
  url: string
): Promise<{ ok: boolean; status: number; data?: T }> {
  const res = await pkFetch(withCacheBust(url), {
    method: "GET",
    headers: new Headers({
      Accept: "application/json",
      "Cache-Control": "no-cache",
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = (await res.json()) as T;
  return { ok: true, status: res.status, data };
}

async function writeText(
  url: string,
  body: string,
  contentType: string,
  ifMatch?: string
) {
  const headers = new Headers({ "Content-Type": contentType });
  if (ifMatch) headers.set("If-Match", ifMatch);
  const res = await pkFetch(url, { method: "PUT", headers, body });
  return res;
}

async function writeJson(url: string, body: any, ifMatch?: string) {
  return writeText(url, JSON.stringify(body), "application/json", ifMatch);
}

// Compute a weak ETag as SHA-256 hex of text
async function computeEtag(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hash));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `W/"${hex}"`;
}

// RFC 2445 utility functions
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\") // Backslash escaping
    .replace(/;/g, "\\;") // Semicolon escaping
    .replace(/,/g, "\\,") // Comma escaping
    .replace(/\n/g, "\\n") // Newline escaping
    .replace(/\r/g, "\\r"); // Carriage return escaping
}

function formatDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// RFC 2445 content line folding (max 75 octets per line)
function foldLine(line: string): string {
  if (line.length <= 75) return line;

  const folded = [];
  let start = 0;

  while (start < line.length) {
    if (start === 0) {
      // First line can be up to 75 characters
      folded.push(line.substring(start, Math.min(start + 75, line.length)));
      start += 75;
    } else {
      // Continuation lines start with space and can be up to 74 more chars
      folded.push(
        " " + line.substring(start, Math.min(start + 74, line.length))
      );
      start += 74;
    }
  }

  return folded.join("\r\n");
}

// RFC 2445 compliant VCALENDAR generation
function baseVcalendar(props?: CalendarProps): string {
  const prodid = "PRODID:-//Calky//EN";
  const version = "VERSION:2.0";
  const calscale = props?.calscale
    ? `CALSCALE:${props.calscale}`
    : "CALSCALE:GREGORIAN";
  const method = props?.method ? `METHOD:${props.method}` : "";
  const displayName = props?.displayName
    ? `X-WR-CALNAME:${props.displayName}`
    : "";

  const lines = ["BEGIN:VCALENDAR", prodid, version, calscale];

  if (method) lines.push(method);
  if (displayName) lines.push(displayName);

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n");
}

// RFC 2445 compliant VEVENT generation
function buildVevent(input: NewEventInput, uid?: string): string {
  const now = new Date();
  const eventUid = uid || `${crypto.randomUUID()}@calky`;

  const lines = [
    "BEGIN:VEVENT",
    foldLine(`UID:${eventUid}`),
    foldLine(`DTSTAMP:${formatDateTime(now)}`),
    foldLine(`DTSTART:${formatDateTime(input.start)}`),
    foldLine(`DTEND:${formatDateTime(input.end)}`),
    foldLine(`SUMMARY:${escapeText(input.summary)}`),
    foldLine(`CREATED:${formatDateTime(now)}`),
    foldLine(`LAST-MODIFIED:${formatDateTime(now)}`),
  ];

  // Optional properties
  if (input.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeText(input.description)}`));
  }

  if (input.location) {
    lines.push(foldLine(`LOCATION:${escapeText(input.location)}`));
  }

  if (input.categories && input.categories.length > 0) {
    lines.push(
      foldLine(`CATEGORIES:${input.categories.map(escapeText).join(",")}`)
    );
  }

  if (input.class) {
    lines.push(foldLine(`CLASS:${input.class}`));
  }

  if (input.status) {
    lines.push(foldLine(`STATUS:${input.status}`));
  }

  if (input.transp) {
    lines.push(foldLine(`TRANSP:${input.transp}`));
  }

  if (input.priority !== undefined) {
    lines.push(foldLine(`PRIORITY:${input.priority}`));
  }

  if (input.sequence !== undefined) {
    lines.push(foldLine(`SEQUENCE:${input.sequence}`));
  } else {
    lines.push(foldLine(`SEQUENCE:0`));
  }

  // Recurrence properties
  if (input.rrule) {
    lines.push(foldLine(`RRULE:${input.rrule}`));
  }

  if (input.exdate && input.exdate.length > 0) {
    const exdates = input.exdate.map(formatDateTime).join(",");
    lines.push(foldLine(`EXDATE:${exdates}`));
  }

  // Organizer
  if (input.organizer) {
    let organizerLine = `ORGANIZER`;
    if (input.organizer.cn) {
      organizerLine += `;CN="${escapeText(input.organizer.cn)}"`;
    }
    if (input.organizer.sentBy) {
      organizerLine += `;SENT-BY="${input.organizer.sentBy}"`;
    }
    organizerLine += `:MAILTO:${input.organizer.email}`;
    lines.push(foldLine(organizerLine));
  }

  // Attendees
  if (input.attendees && input.attendees.length > 0) {
    for (const attendee of input.attendees) {
      let attendeeLine = `ATTENDEE`;
      if (attendee.cn) {
        attendeeLine += `;CN="${escapeText(attendee.cn)}"`;
      }
      if (attendee.role) {
        attendeeLine += `;ROLE=${attendee.role}`;
      }
      if (attendee.partstat) {
        attendeeLine += `;PARTSTAT=${attendee.partstat}`;
      }
      if (attendee.rsvp !== undefined) {
        attendeeLine += `;RSVP=${attendee.rsvp ? "TRUE" : "FALSE"}`;
      }
      attendeeLine += `:MAILTO:${attendee.email}`;
      lines.push(foldLine(attendeeLine));
    }
  }

  lines.push("END:VEVENT");

  // Add alarms
  if (input.alarms && input.alarms.length > 0) {
    const alarmLines = [];
    for (const alarm of input.alarms) {
      alarmLines.push("BEGIN:VALARM");
      alarmLines.push(foldLine(`ACTION:${alarm.action}`));
      alarmLines.push(foldLine(`TRIGGER:${alarm.trigger}`));

      if (alarm.description) {
        alarmLines.push(
          foldLine(`DESCRIPTION:${escapeText(alarm.description)}`)
        );
      }

      if (alarm.repeat !== undefined) {
        alarmLines.push(foldLine(`REPEAT:${alarm.repeat}`));
      }

      if (alarm.duration) {
        alarmLines.push(foldLine(`DURATION:${alarm.duration}`));
      }

      alarmLines.push("END:VALARM");
    }

    // Insert alarms before END:VEVENT
    lines.splice(lines.length - 1, 0, ...alarmLines);
  }

  return lines.join("\r\n");
}

function appendVevent(ics: string, vevent: string): string {
  const endIndex = ics.lastIndexOf("END:VCALENDAR");
  if (endIndex === -1) throw new Error("Invalid VCALENDAR format");
  return ics.slice(0, endIndex) + vevent + "\r\n" + ics.slice(endIndex);
}

function removeVeventByUid(ics: string, uid: string): string {
  const lines = ics.split(/\r?\n/);
  const result = [];
  let inEvent = false;
  let eventUid = "";
  let eventLines: string[] = [];

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      eventLines = [line];
      eventUid = "";
    } else if (line === "END:VEVENT" && inEvent) {
      eventLines.push(line);
      if (eventUid !== uid) {
        result.push(...eventLines);
      }
      inEvent = false;
      eventLines = [];
    } else if (inEvent) {
      eventLines.push(line);
      if (line.startsWith("UID:")) {
        eventUid = line.substring(4).trim();
      }
    } else {
      result.push(line);
    }
  }

  return result.join("\r\n");
}

function replaceVeventByUid(
  ics: string,
  uid: string,
  newVevent: string
): string {
  const withoutOld = removeVeventByUid(ics, uid);
  return appendVevent(withoutOld, newVevent);
}

// Parse VEVENT from ICS content
export function listEvents(ics: string): CalendarEvent[] {
  if (!ics || !ics.includes("BEGIN:VEVENT")) return [];

  const events: CalendarEvent[] = [];
  const lines = ics.split(/\r?\n/);
  let currentEvent: Partial<CalendarEvent> | null = null;
  let inEvent = false;
  let eventLines: string[] = [];

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = {};
      eventLines = [line];
    } else if (line === "END:VEVENT" && inEvent) {
      eventLines.push(line);
      if (currentEvent) {
        currentEvent.raw = eventLines.join("\r\n");

        // Validate required fields
        if (
          currentEvent.uid &&
          currentEvent.summary &&
          currentEvent.start &&
          currentEvent.end
        ) {
          events.push(currentEvent as CalendarEvent);
        }
      }
      inEvent = false;
      currentEvent = null;
      eventLines = [];
    } else if (inEvent && currentEvent) {
      eventLines.push(line);

      // Parse properties
      if (line.startsWith("UID:")) {
        currentEvent.uid = line.substring(4).trim();
      } else if (line.startsWith("SUMMARY:")) {
        currentEvent.summary = line.substring(8).trim();
      } else if (line.startsWith("DESCRIPTION:")) {
        currentEvent.description = line.substring(12).trim();
      } else if (line.startsWith("LOCATION:")) {
        currentEvent.location = line.substring(9).trim();
      } else if (line.startsWith("DTSTART:")) {
        const dateStr = line.substring(8).trim();
        currentEvent.start = new Date(
          dateStr.replace(
            /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/,
            "$1-$2-$3T$4:$5:$6Z"
          )
        );
      } else if (line.startsWith("DTEND:")) {
        const dateStr = line.substring(6).trim();
        currentEvent.end = new Date(
          dateStr.replace(
            /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/,
            "$1-$2-$3T$4:$5:$6Z"
          )
        );
      } else if (line.startsWith("CREATED:")) {
        const dateStr = line.substring(8).trim();
        currentEvent.created = new Date(
          dateStr.replace(
            /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/,
            "$1-$2-$3T$4:$5:$6Z"
          )
        );
      } else if (line.startsWith("LAST-MODIFIED:")) {
        const dateStr = line.substring(14).trim();
        currentEvent.lastModified = new Date(
          dateStr.replace(
            /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/,
            "$1-$2-$3T$4:$5:$6Z"
          )
        );
      } else if (line.startsWith("DTSTAMP:")) {
        const dateStr = line.substring(8).trim();
        currentEvent.dtstamp = new Date(
          dateStr.replace(
            /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/,
            "$1-$2-$3T$4:$5:$6Z"
          )
        );
      } else if (line.startsWith("SEQUENCE:")) {
        currentEvent.sequence = parseInt(line.substring(9).trim(), 10) || 0;
      } else if (line.startsWith("STATUS:")) {
        currentEvent.status = line.substring(7).trim();
      } else if (line.startsWith("CATEGORIES:")) {
        currentEvent.categories = line
          .substring(11)
          .trim()
          .split(",")
          .map((s) => s.trim());
      } else if (line.startsWith("PRIORITY:")) {
        currentEvent.priority = parseInt(line.substring(9).trim(), 10);
      } else if (line.startsWith("CLASS:")) {
        currentEvent.class = line.substring(6).trim();
      }
    }
  }

  return events;
}

// Ensure index.json exists at app root
export async function ensureIndex(session: any): Promise<CalendarIndex> {
  const { index } = paths(session.pubkey);
  const url = pkUrl(session.pubkey, index);
  const res = await readJson<CalendarIndex>(url);
  if (res.ok && res.data) return res.data;
  if (res.status !== 404)
    throw new Error(`Failed to read index.json (status ${res.status})`);
  const empty: CalendarIndex = { calendars: [] };
  const put = await writeJson(url, empty);
  if (!put.ok)
    throw new Error(`Failed to create index.json (status ${put.status})`);
  return empty;
}

export async function getIndex(session: any): Promise<CalendarIndex> {
  const { index } = paths(session.pubkey);
  const url = pkUrl(session.pubkey, index);
  const res = await readJson<CalendarIndex>(url);
  if (res.ok && res.data) return res.data;
  if (res.status === 404) return { calendars: [] };
  throw new Error(`Failed to load index.json (status ${res.status})`);
}

export async function getCalendarProps(
  session: any,
  calendarId: string
): Promise<CalendarProps | null> {
  const { props } = paths(session.pubkey, calendarId);
  const url = pkUrl(session.pubkey, props!);
  const res = await readJson<CalendarProps>(url);
  if (res.ok && res.data) return res.data;
  if (res.status === 404) return null;
  throw new Error(`Failed to load props.json (status ${res.status})`);
}

// Local ICS cache (per-user, per-calendar)
const CACHE_PREFIX = "calky_ics_cache_v1";
const FRESH_WINDOW_MS = 40 * 60 * 1000; // 40 minutes

type CachedIcs = {
  ics: string;
  etag: string | null;
  updatedAt: number;
};

function cacheKey(pubkey: string, calendarId: string) {
  return `${CACHE_PREFIX}:${pubkey}:${calendarId}`;
}

function readIcsCache(pubkey: string, calendarId: string): CachedIcs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(pubkey, calendarId));
    return raw ? (JSON.parse(raw) as CachedIcs) : null;
  } catch {
    return null;
  }
}

function writeIcsCache(
  pubkey: string,
  calendarId: string,
  ics: string,
  etag: string | null
) {
  if (typeof window === "undefined") return;
  try {
    const val: CachedIcs = { ics, etag: etag ?? null, updatedAt: Date.now() };
    localStorage.setItem(cacheKey(pubkey, calendarId), JSON.stringify(val));
  } catch {
    // ignore quota/JSON errors
  }
}

export function clearCalendarCache(pubkey: string, calendarId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(cacheKey(pubkey, calendarId));
  } catch {
    // ignore
  }
}

export function clearAllCalendarCache(pubkey: string) {
  if (typeof window === "undefined") return;
  try {
    const prefix = `${CACHE_PREFIX}:${pubkey}:`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

export async function getCalendarIcs(
  session: any,
  calendarId: string
): Promise<{ ics: string | null; etag: string | null }> {
  const p = paths(session.pubkey, calendarId);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);

  const local = readIcsCache(session.pubkey, calendarId);

  // First, try to read remote etag to detect changes without downloading full ICS
  const etagRes = await readText(etagUrl);
  const serverEtag = etagRes.ok ? (etagRes.text || "").trim() : null;

  // If we have a local cache and etags match, return local immediately
  if (local && local.etag && local.etag === serverEtag) {
    return { ics: local.ics, etag: local.etag };
  }

  // If we have a local cache, but server etag differs (likely stale Nexus) and our cache is fresh, prefer local
  const cacheIsFresh =
    !!local && Date.now() - local.updatedAt < FRESH_WINDOW_MS;

  if (local && cacheIsFresh && serverEtag && local.etag !== serverEtag) {
    // Prefer local (assume Nexus is stale)
    return { ics: local.ics, etag: local.etag };
  }

  // Fetch server ICS as a fallback or when no cache or no etag
  const icsRes = await readText(icsUrl);
  if (icsRes.ok) {
    const serverIcs = icsRes.text || "";
    // Update local cache with what we got
    writeIcsCache(session.pubkey, calendarId, serverIcs, serverEtag);
    return { ics: serverIcs, etag: serverEtag };
  }

  // If server failed but we have local cache, use it
  if (local) {
    return { ics: local.ics, etag: local.etag };
  }

  // Nothing available
  return { ics: null, etag: null };
}

// Create a new calendar collection with UUID id
export async function createCalendar(
  session: any,
  initProps: {
    displayName: string;
    color?: string;
    timezone?: string;
    description?: string;
    method?: string;
    calscale?: string;
  },
  initialEvent?: NewEventInput
) {
  if (!session?.pubkey) throw new Error("Missing session.pubkey");
  const id = crypto.randomUUID();
  const p = paths(session.pubkey, id);

  // 1) Ensure index exists
  const index = await ensureIndex(session);

  // 2) Prepare props
  const props: CalendarProps = {
    id,
    displayName: initProps.displayName,
    color: initProps.color,
    timezone: initProps.timezone,
    description: initProps.description,
    method: initProps.method || "PUBLISH",
    calscale: initProps.calscale || "GREGORIAN",
    ctag: "v1",
    readOnly: false,
    owner: session.pubkey,
  };

  // 3) Prepare base VCALENDAR with RFC 2445 compliance
  let ics = baseVcalendar(props);
  if (initialEvent) {
    const ev = buildVevent(initialEvent);
    ics = appendVevent(ics, ev);
  }
  const etag = await computeEtag(ics);

  // 4) Write props, ics, etag
  const propsUrl = pkUrl(session.pubkey, p.props!);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);

  const [wProps, wIcs, wEtag] = await Promise.all([
    writeJson(propsUrl, props),
    writeText(icsUrl, ics, "text/calendar; charset=utf-8"),
    writeText(etagUrl, etag, "text/plain; charset=utf-8"),
  ]);
  if (!wProps.ok || !wIcs.ok || !wEtag.ok) {
    throw new Error(
      `Failed to create calendar (${wProps.status}/${wIcs.status}/${wEtag.status})`
    );
  }

  // Keep local cache in sync
  writeIcsCache(session.pubkey, id, ics, etag);

  // 5) Update index.json
  const entry: CalendarIndexEntry = {
    id,
    href: `${APP_ROOT}/cal/${id}/`,
    displayName: props.displayName,
    color: props.color,
    readOnly: !!props.readOnly,
  };
  const updated: CalendarIndex = { calendars: [entry, ...index.calendars] };
  const idxUrl = pkUrl(session.pubkey, paths(session.pubkey).index);
  const wIdx = await writeJson(idxUrl, updated);
  if (!wIdx.ok)
    throw new Error(`Failed to update index.json (status ${wIdx.status})`);

  return { id, props, etag, ics };
}

// Append event to calendar.ics with optimistic concurrency using ETag
export async function addEvent(
  session: any,
  calendarId: string,
  input: NewEventInput
) {
  const { ics: oldIcs, etag: oldEtag } = await getCalendarIcs(
    session,
    calendarId
  );
  const calProps = await getCalendarProps(session, calendarId);
  const current = oldIcs ?? baseVcalendar(calProps || undefined);
  const event = buildVevent(input);
  let nextIcs = appendVevent(current, event);

  const p = paths(session.pubkey, calendarId);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);

  // Try with If-Match when we have an etag
  let put = await writeText(
    icsUrl,
    nextIcs,
    "text/calendar; charset=utf-8",
    oldEtag || undefined
  );
  if (put.status === 412 /* Precondition Failed */ || put.status === 409) {
    // Re-read and attempt one merge by appending again
    const reread = await getCalendarIcs(session, calendarId);
    const merged = appendVevent(
      reread.ics ?? baseVcalendar(calProps || undefined),
      event
    );
    nextIcs = merged;
    put = await writeText(
      icsUrl,
      merged,
      "text/calendar; charset=utf-8",
      reread.etag || undefined
    );
    if (!put.ok) throw new Error(`Write conflict (status ${put.status})`);
  } else if (!put.ok) {
    throw new Error(`Failed to write calendar.ics (status ${put.status})`);
  }

  // Update etag.txt
  const nextEtag = await computeEtag(nextIcs);
  const wE = await writeText(etagUrl, nextEtag, "text/plain; charset=utf-8");
  if (!wE.ok)
    throw new Error(`Failed to update etag.txt (status ${wE.status})`);

  // Update local cache to reflect latest ICS immediately
  writeIcsCache(session.pubkey, calendarId, nextIcs, nextEtag);

  // Bump ctag in props.json
  await bumpCtag(session, calendarId);

  return { ok: true } as const;
}

// Remove an event by UID
export async function deleteEvent(
  session: any,
  calendarId: string,
  uid: string
) {
  const { ics: oldIcs, etag: oldEtag } = await getCalendarIcs(
    session,
    calendarId
  );
  const calProps = await getCalendarProps(session, calendarId);
  const current = oldIcs ?? baseVcalendar(calProps || undefined);
  const next = removeVeventByUid(current, uid);
  if (next === current) return { ok: true } as const; // nothing to do

  const p = paths(session.pubkey, calendarId);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);

  let finalIcs = next;

  let put = await writeText(
    icsUrl,
    next,
    "text/calendar; charset=utf-8",
    oldEtag || undefined
  );
  if (put.status === 412 || put.status === 409) {
    const reread = await getCalendarIcs(session, calendarId);
    const merged = removeVeventByUid(
      reread.ics ?? baseVcalendar(calProps || undefined),
      uid
    );
    finalIcs = merged;
    put = await writeText(
      icsUrl,
      merged,
      "text/calendar; charset=utf-8",
      reread.etag || undefined
    );
    if (!put.ok) throw new Error(`Write conflict (status ${put.status})`);
  } else if (!put.ok) {
    throw new Error(`Failed to write calendar.ics (status ${put.status})`);
  }

  const nextEtag = await computeEtag(finalIcs);
  const wE = await writeText(etagUrl, nextEtag, "text/plain; charset=utf-8");
  if (!wE.ok)
    throw new Error(`Failed to update etag.txt (status ${wE.status})`);

  // Update local cache
  writeIcsCache(session.pubkey, calendarId, finalIcs, nextEtag);

  await bumpCtag(session, calendarId);
  return { ok: true } as const;
}

// Update an event identified by UID with new values
export async function updateEvent(
  session: any,
  calendarId: string,
  uid: string,
  updates: NewEventInput
) {
  const { ics: oldIcs, etag: oldEtag } = await getCalendarIcs(
    session,
    calendarId
  );
  const calProps = await getCalendarProps(session, calendarId);
  const current = oldIcs ?? baseVcalendar(calProps || undefined);
  const updatedBlock = buildVevent(updates, uid);
  const next = replaceVeventByUid(current, uid, updatedBlock);

  const p = paths(session.pubkey, calendarId);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);

  let finalIcs = next;

  let put = await writeText(
    icsUrl,
    next,
    "text/calendar; charset=utf-8",
    oldEtag || undefined
  );
  if (put.status === 412 || put.status === 409) {
    const reread = await getCalendarIcs(session, calendarId);
    const merged = replaceVeventByUid(
      reread.ics ?? baseVcalendar(calProps || undefined),
      uid,
      updatedBlock
    );
    finalIcs = merged;
    put = await writeText(
      icsUrl,
      merged,
      "text/calendar; charset=utf-8",
      reread.etag || undefined
    );
    if (!put.ok) throw new Error(`Write conflict (status ${put.status})`);
  } else if (!put.ok) {
    throw new Error(`Failed to write calendar.ics (status ${put.status})`);
  }

  const nextEtag = await computeEtag(finalIcs);
  const wE = await writeText(etagUrl, nextEtag, "text/plain; charset=utf-8");
  if (!wE.ok)
    throw new Error(`Failed to update etag.txt (status ${wE.status})`);

  // Update local cache
  writeIcsCache(session.pubkey, calendarId, finalIcs, nextEtag);

  await bumpCtag(session, calendarId);
  return { ok: true } as const;
}

// Delete entire calendar
export async function deleteCalendar(session: any, calendarId: string) {
  const index = await getIndex(session);
  const updated = {
    calendars: index.calendars.filter((c) => c.id !== calendarId),
  };

  const idxUrl = pkUrl(session.pubkey, paths(session.pubkey).index);
  const put = await writeJson(idxUrl, updated);
  if (!put.ok)
    throw new Error(`Failed to update index.json (status ${put.status})`);

  // Drop local cache for this calendar
  clearCalendarCache(session.pubkey, calendarId);

  return { ok: true } as const;
}

// Update calendar properties
export async function updateCalendarProps(
  session: any,
  calendarId: string,
  updates: Partial<
    Pick<
      CalendarProps,
      | "displayName"
      | "color"
      | "timezone"
      | "description"
      | "method"
      | "calscale"
    >
  >
) {
  const currentProps = await getCalendarProps(session, calendarId);
  if (!currentProps) throw new Error("Calendar not found");

  const updatedProps = { ...currentProps, ...updates };
  const p = paths(session.pubkey, calendarId);
  const propsUrl = pkUrl(session.pubkey, p.props!);

  const put = await writeJson(propsUrl, updatedProps);
  if (!put.ok)
    throw new Error(`Failed to update props.json (status ${put.status})`);

  // Update index as well
  const index = await getIndex(session);
  const updatedIndex = {
    calendars: index.calendars.map((c) =>
      c.id === calendarId
        ? {
            ...c,
            displayName: updatedProps.displayName,
            color: updatedProps.color,
          }
        : c
    ),
  };

  const idxUrl = pkUrl(session.pubkey, paths(session.pubkey).index);
  const idxPut = await writeJson(idxUrl, updatedIndex);
  if (!idxPut.ok)
    throw new Error(`Failed to update index.json (status ${idxPut.status})`);

  await bumpCtag(session, calendarId);
  return updatedProps;
}

// Bump collection tag for change tracking
async function bumpCtag(session: any, calendarId: string) {
  const props = await getCalendarProps(session, calendarId);
  if (!props) return;

  const currentNum = parseInt(props.ctag.slice(1)) || 1;
  const newCtag = `v${currentNum + 1}`;

  const updatedProps = { ...props, ctag: newCtag };
  const p = paths(session.pubkey, calendarId);
  const propsUrl = pkUrl(session.pubkey, p.props!);

  await writeJson(propsUrl, updatedProps);
}

// Export all functions for use
export {
  buildVevent,
  appendVevent,
  removeVeventByUid,
  replaceVeventByUid,
  escapeText,
  formatDateTime,
  formatDate,
  foldLine,
};
