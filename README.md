# Calky — Pubky Calendar (iCalendar-powered)

A decentralized calendar app built with Next.js, Tailwind CSS, and Pubky. Calky uses iCalendar (.ics) under the hood and stores your calendars on your Pubky homeserver. Public calendars are addressable and shareable; you stay in control of your data.

This is a [Next.js](https://nextjs.org) app bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

- 🔐 Pubky authentication with key-based identity
- 🌐 Decentralized storage on your homeserver; public calendars under `/pub/calky`
- 📅 iCalendar (.ics) support: create calendars and add/delete events
- 🧭 Timezone selection (IANA time zones) per calendar
- 🎨 Color picker per calendar (via `react-colorful`)
- 🧰 Calendar actions menu (edit/delete) and reload
- �️ Events rendered as cards with quick delete
- 📄 Collapsible raw `.ics` viewer for each calendar
- 🧩 TypeScript, Tailwind, and modern Next.js app router

## Pubky Integration

Calky uses the following Pubky packages:

### Core Dependencies

- **[@synonymdev/pubky](https://www.npmjs.com/package/@synonymdev/pubky)** `^0.5.4` - Core Pubky SDK for decentralized identity and data management
- **[pubky-app-specs](https://www.npmjs.com/package/pubky-app-specs)** `^0.3.5` - Application specifications and schemas for Pubky apps

### Authentication Flow

1. **Pubky Ring App** - Mobile app for secure key management and authentication
2. **QR Code Authentication** - Scan QR codes to connect your Pubky identity
3. **Decentralized Storage** - Your data is stored on your chosen homeserver
4. **Key-based Identity** - No passwords, just cryptographic keys

### How it Works

- Authenticate using the Pubky Ring mobile app
- Calendars are Pubky-addressable resources stored on your homeserver
- Public calendar data lives under `/pub/calky` so anyone can fetch it
- Private data (planned) will live under non-public app paths with explicit sharing

### Storage layout (public)

For each calendar, Calky writes a small set of files under `/pub/calky/<calendarId>`:

- index/metadata (calendar id, display name, color, etc.)
- props (calendar-level properties like display name, color, timezone)
- `calendar.ics` with your events
- an ETag or version marker for sync

Note: exact filenames may evolve; the contract is a simple, fetchable, Pubky-addressable calendar folder.

### iCalendar today

- Create calendars with a display name, color, and timezone
- Add events with summary, description, location, start/end
- Delete events; the `.ics` regenerates to reflect changes
- Collapse/expand raw `.ics` for debugging or exporting

## Installation

1. **Clone the repository**

```bash
# Example
git clone https://github.com/gillohner/calky.git
cd calky
```

2. **Install dependencies**

```bash
yarn install
# or: npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` and update the values according to your needs:

- `NEXT_PUBLIC_PUBKY_APP_ID`: Your unique application ID
- `NEXT_PUBLIC_PUBKY_APP_NAME`: Your application name
- `PUBLIC_DOMAIN`: Your domain (localhost:3000 for development)

## Getting Started

Run the development server:

```bash
yarn dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Roadmap: calendar standards on Pubky

We plan to implement broader calendar standards and features, using Pubky and homeservers to host shareable references and data:

- RFC 5545 iCalendar: richer event fields, recurrence (RRULE/EXDATE/RDATE), alarms
- RFC 5546 iTIP: scheduling messages for invites, replies, and updates
- RFC 4791 CalDAV: client interoperability and optional server adapters
- Webcal subscriptions: subscribe to remote .ics feeds
- RFC 7265 jCal: JSON representation of iCalendar for API use
- Time zone data: robust tz handling and conversion
- Sharing and discovery: Pubky-signed references for calendars/events hosted on homeservers with semantic tagging
