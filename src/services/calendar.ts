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

// Small contract for event creation
export interface NewEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: Date; // local Date, we'll serialize as UTC Z
  end: Date; // must be > start
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
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

async function readText(
  url: string
): Promise<{ ok: boolean; status: number; text?: string }> {
  const res = await pkFetch(url, {
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
  const res = await pkFetch(url, {
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

export async function getCalendarIcs(
  session: any,
  calendarId: string
): Promise<{ ics: string | null; etag: string | null }> {
  const p = paths(session.pubkey, calendarId);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);
  const [icsRes, etagRes] = await Promise.all([
    readText(icsUrl),
    readText(etagUrl),
  ]);
  return {
    ics: icsRes.ok ? icsRes.text || "" : null,
    etag: etagRes.ok ? (etagRes.text || "").trim() : null,
  };
}

// Create a new calendar collection with UUID id
export async function createCalendar(
  session: any,
  initProps: {
    displayName: string;
    color?: string;
    timezone?: string;
    description?: string;
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
    ctag: "v1",
    readOnly: false,
    owner: session.pubkey,
  };

  // 3) Prepare base VCALENDAR
  let ics = baseVcalendar();
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
  const current = oldIcs ?? baseVcalendar();
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
    const merged = appendVevent(reread.ics ?? baseVcalendar(), event);
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
  const current = oldIcs ?? baseVcalendar();
  const next = removeVeventByUid(current, uid);
  if (next === current) return { ok: true } as const; // nothing to do

  const p = paths(session.pubkey, calendarId);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);

  let put = await writeText(
    icsUrl,
    next,
    "text/calendar; charset=utf-8",
    oldEtag || undefined
  );
  if (put.status === 412 || put.status === 409) {
    const reread = await getCalendarIcs(session, calendarId);
    const merged = removeVeventByUid(reread.ics ?? baseVcalendar(), uid);
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

  const nextEtag = await computeEtag(next);
  const wE = await writeText(etagUrl, nextEtag, "text/plain; charset=utf-8");
  if (!wE.ok)
    throw new Error(`Failed to update etag.txt (status ${wE.status})`);

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
  const current = oldIcs ?? baseVcalendar();
  const updatedBlock = buildVevent(updates, uid);
  const next = replaceVeventByUid(current, uid, updatedBlock);

  const p = paths(session.pubkey, calendarId);
  const icsUrl = pkUrl(session.pubkey, p.ics!);
  const etagUrl = pkUrl(session.pubkey, p.etag!);

  let put = await writeText(
    icsUrl,
    next,
    "text/calendar; charset=utf-8",
    oldEtag || undefined
  );
  if (put.status === 412 || put.status === 409) {
    const reread = await getCalendarIcs(session, calendarId);
    const next2 = replaceVeventByUid(
      reread.ics ?? baseVcalendar(),
      uid,
      updatedBlock
    );
    put = await writeText(
      icsUrl,
      next2,
      "text/calendar; charset=utf-8",
      reread.etag || undefined
    );
    if (!put.ok) throw new Error(`Write conflict (status ${put.status})`);
  } else if (!put.ok) {
    throw new Error(`Failed to write calendar.ics (status ${put.status})`);
  }

  const nextEtag = await computeEtag(next);
  const wE = await writeText(etagUrl, nextEtag, "text/plain; charset=utf-8");
  if (!wE.ok)
    throw new Error(`Failed to update etag.txt (status ${wE.status})`);

  await bumpCtag(session, calendarId);
  return { ok: true } as const;
}

// List events parsed from ICS
export function listEvents(ics: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  if (!ics) return events;
  const blocks = ics.split(/BEGIN:VEVENT\r?\n|BEGIN:VEVENT\n/);
  for (let i = 1; i < blocks.length; i++) {
    const afterBegin = blocks[i];
    const endIdx = afterBegin.indexOf("END:VEVENT");
    if (endIdx === -1) continue;
    const block = afterBegin.slice(0, endIdx).trim();
    const raw = `BEGIN:VEVENT\n${block}\nEND:VEVENT`;
    const lines = block.split(/\r?\n/);
    const get = (prefix: string) =>
      lines.find((l) => l.startsWith(prefix + ":"))?.slice(prefix.length + 1);
    const uid = get("UID") || crypto.randomUUID();
    const summary = get("SUMMARY") || "(no summary)";
    const description = get("DESCRIPTION");
    const location = get("LOCATION");
    const ds = get("DTSTART");
    const de = get("DTEND");
    const parse = (v?: string) => (v ? icsDateToDate(v) : new Date());
    events.push({
      uid,
      summary: unescapeText(summary),
      description: unescapeText(description || ""),
      location: unescapeText(location || ""),
      start: parse(ds),
      end: parse(de),
      raw,
    });
  }
  // sort by start time
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}

// Update calendar props.json (e.g., displayName, color, timezone, description)
export async function updateCalendarProps(
  session: any,
  calendarId: string,
  partial: Partial<
    Pick<CalendarProps, "displayName" | "color" | "timezone" | "description">
  >
) {
  const p = paths(session.pubkey, calendarId);
  const url = pkUrl(session.pubkey, p.props!);
  const res = await readJson<CalendarProps>(url);
  if (!res.ok || !res.data) throw new Error("Failed to read props.json");
  const next = { ...res.data, ...partial } as CalendarProps;
  const w = await writeJson(url, next);
  if (!w.ok) throw new Error(`Failed to write props.json (status ${w.status})`);
  return next;
}

// Delete calendar: remove from index and delete files
export async function deleteCalendar(session: any, calendarId: string) {
  const p = paths(session.pubkey, calendarId);
  const client = await initPubkyClient();
  // Best-effort delete files (folders may remain)
  const files = [p.props!, p.ics!, p.etag!];
  await Promise.all(
    files.map(async (rel) => {
      const url = pkUrl(session.pubkey, rel);
      try {
        const r = await client.fetch(url, {
          method: "DELETE",
          credentials: "include",
        });
        if (!r.ok && r.status !== 404) {
          console.warn("Delete failed", rel, r.status);
        }
      } catch (e) {
        console.warn("Delete error", rel, e);
      }
    })
  );

  // Update index.json to remove entry
  const idxPath = paths(session.pubkey).index;
  const idxUrl = pkUrl(session.pubkey, idxPath);
  const res = await readJson<CalendarIndex>(idxUrl);
  if (res.ok && res.data) {
    const next: CalendarIndex = {
      calendars: (res.data.calendars || []).filter((c) => c.id !== calendarId),
    };
    await writeJson(idxUrl, next);
  }
  return { ok: true } as const;
}

// Increment props.ctag (vN)
async function bumpCtag(session: any, calendarId: string) {
  const p = paths(session.pubkey, calendarId);
  const url = pkUrl(session.pubkey, p.props!);
  const res = await readJson<CalendarProps>(url);
  if (!res.ok || !res.data) return; // soft fail
  const current = res.data;
  const match = String(current.ctag || "v0").match(/^v(\d+)$/);
  const next = match ? `v${Number(match[1]) + 1}` : "v1";
  current.ctag = next;
  await writeJson(url, current);
}

// VCALENDAR skeleton
function baseVcalendar() {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calky//Pubky//EN",
    "CALSCALE:GREGORIAN",
    "END:VCALENDAR",
    "",
  ].join("\n");
}

function formatUtc(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = dt.getUTCFullYear();
  const m = pad(dt.getUTCMonth() + 1);
  const d = pad(dt.getUTCDate());
  const hh = pad(dt.getUTCHours());
  const mm = pad(dt.getUTCMinutes());
  const ss = pad(dt.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function escapeText(s?: string) {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildVevent(ev: NewEventInput, fixedUid?: string) {
  const uid = fixedUid || crypto.randomUUID();
  const dtstamp = formatUtc(new Date());
  const dtstart = formatUtc(ev.start);
  const dtend = formatUtc(ev.end);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(ev.summary)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  lines.push("END:VEVENT");
  return lines.join("\n");
}

function appendVevent(ics: string, vevent: string) {
  const endIdx = ics.lastIndexOf("END:VCALENDAR");
  if (endIdx === -1) return `${ics}\n${vevent}\n`; // fallback
  const before = ics.slice(0, endIdx);
  const after = ics.slice(endIdx);
  return `${before}${vevent}\n${after}`;
}

function removeVeventByUid(ics: string, uid: string) {
  const re = new RegExp(
    `(BEGIN:VEVENT[\s\S]*?\nUID:${uid}\r?\n[\s\S]*?END:VEVENT\r?\n?)`,
    "m"
  );
  return ics.replace(re, "");
}

function replaceVeventByUid(ics: string, uid: string, newBlock: string) {
  const removed = removeVeventByUid(ics, uid);
  // If nothing removed, append
  if (removed === ics) return appendVevent(ics, newBlock);
  // Insert new block before END:VCALENDAR
  return appendVevent(removed, newBlock);
}

function icsDateToDate(v: string): Date {
  // Expect Zulu: YYYYMMDDTHHMMSSZ or date-only YYYYMMDD
  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return new Date(Date.UTC(y, m, d, hh, mm, ss));
  }
  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    return new Date(Date.UTC(y, m, d));
  }
  // Fallback to Date parse
  return new Date(v);
}

function unescapeText(s: string) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}
