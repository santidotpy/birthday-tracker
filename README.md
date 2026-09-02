# Birthday Tracker

An ambient screen that answers one question at a glance: **whose birthday is it?**

Built for a small company — fewer than thirty people — to leave running on a TV
in the office for weeks at a time. It shows who is celebrating today, who is
next, and how long until then. Nobody logs in, nobody searches, nobody filters.

**[Live demo](https://santidotpy.github.io/birthday-tracker/)** · **[Leer en castellano →](README.es.md)**

> [!CAUTION]
> **This app is unauthenticated by design.** Everything except `/admin` is
> public: the full name, photo and birthday of every person on the list is
> readable by anyone who can reach the URL.
>
> That is the correct trade-off on an office LAN or behind a VPN, which is what
> it was built for. It is **not** correct on a public domain — putting it there
> publishes your colleagues' personal data to the internet and to search
> engines. `docs/DESPLIEGUE.md` will happily walk you through attaching a public
> hostname with a certificate; make sure you actually want that before you do.
>
> If you need it reachable from outside the office, put it behind a VPN, an IP
> allowlist, or an authenticating reverse proxy.

> [!NOTE]
> **The interface and the source code are in Spanish.** Identifiers, comments,
> tests and UI strings — all of it. See [Making it yours](#making-it-yours) and
> [CONTRIBUTING.md](CONTRIBUTING.md).

## What it does

- **Today's birthday**, front and centre — portrait, name, area, and confetti.
- **Next birthday** with a live countdown, when nobody is celebrating today.
- **The agenda**: everyone's birthday from today forward, wrapping around the
  year rather than restarting in January.
- **Any date**, at `/<date>` — navigating to a past birthday shows whose it was,
  without the confetti. The celebration belongs to the day, not to the date you
  happen to be looking at.
- **Admin panel** at `/admin` for one authenticated administrator: add, edit and
  archive people. People who leave are archived, not deleted.
- **Portraits from a URL.** Paste one and the app downloads, crops and keeps its
  own copy. No photo means initials on a colour derived from the name.
- **Light and dark**, or follow the system. `?tema=oscuro` pins it, which is how
  you configure a TV that reports `prefers-color-scheme: light` because it does
  not know it is a television.

Ages are never stored or shown — a birthday is a day and a month, and that is
all the app knows.

## Quick start

Requires **Node 22+** and **pnpm** (`corepack enable`).

```sh
git clone https://github.com/santidotpy/birthday-tracker.git
cd birthday-tracker
./setup.sh
```

`setup.sh` installs dependencies, creates `.env` with a freshly generated
secret, and migrates the database. Then fill in `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in `.env` and run:

```sh
pnpm seed:admin
pnpm dev            # http://localhost:3000
```

<details>
<summary>Manual setup (or on Windows without Git Bash)</summary>

```sh
pnpm install
cp .env.example .env
# Set BETTER_AUTH_SECRET to the output of: openssl rand -base64 32
# Set ADMIN_EMAIL and ADMIN_PASSWORD (8 characters minimum)
pnpm db:migrate
pnpm seed:admin
pnpm dev
```

</details>

## Configuration

| Variable | Required | What it is |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | yes | Session secret. `openssl rand -base64 32`. In production the app refuses to start with fewer than 32 characters. |
| `BETTER_AUTH_URL` | yes | The exact public URL. If it does not match the address people actually use, sessions are not stored and the admin panel bounces back to the login screen without saying why. |
| `DATABASE_PATH` | yes | SQLite file. Must live on a persistent volume. |
| `RETRATOS_PATH` | yes | Portrait directory. **Same volume** as the database. |
| `ADMIN_EMAIL` · `ADMIN_PASSWORD` · `ADMIN_NAME` | seed only | Read by `pnpm seed:admin` and `pnpm admin:reset`. The running app never looks at them. |
| `PORT` | no | Defaults to 3000. |
| `MIGRATIONS_PATH` | no | Defaults to `drizzle/`. |

## Deploying

```sh
cp .env.example .env      # set BETTER_AUTH_SECRET and BETTER_AUTH_URL
docker compose up -d
docker compose exec app pnpm seed:admin
```

The image is Debian-based (`node:22-slim`), not Alpine, on purpose:
`better-sqlite3` and `sharp` ship prebuilt binaries for glibc, and on musl you
compile them from source.

> [!IMPORTANT]
> **The data lives in a volume, not in the image.** The SQLite database and the
> portraits both go to `/datos`. If that path is not persistent, everything
> works fine — people get added, photos get uploaded — and the first redeploy
> takes it all away. The app refuses to start if it detects that `/datos` is
> container disk rather than a mounted volume.

For Coolify, including the volume, healthcheck and backup details, see
**[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)** (in Spanish).

Lost the administrator password? There is no email recovery — the app sends no
mail. Run `pnpm admin:reset` inside the container. It rebuilds the account from
the `ADMIN_*` environment variables and does not touch anyone's birthday.

## Making it yours

Three things are worth changing before you run this for your own team.

**The timezone.** Every date is evaluated in a single fixed timezone, so that two
people looking at the same moment from different places see the same "N days to
go" and the confetti fires on the same day for everyone. That zone is Argentina,
hardcoded in [`src/domain/fechas.ts`](src/domain/fechas.ts) as `ZONA`. Change
that constant to your own IANA zone — the decision being defended is *one* zone,
not *that* zone. The `pais` column on a person is decorative on purpose.

**The areas.** The department list is a closed set in
[`src/domain/areas.ts`](src/domain/areas.ts), so that "IT", "Sistemas" and "it"
cannot coexist as three different things. Edit the list and redeploy. Removing
an area does not break the people who had it — they simply show without one.

**The language.** The UI is Spanish throughout, and translating it means editing
component text rather than flipping a setting. There is no i18n layer.

## How it works

[TanStack Start](https://tanstack.com/start) · React 19 · SQLite via
[Drizzle](https://orm.drizzle.team) · [Better Auth](https://better-auth.com) ·
Tailwind 4 · shadcn on [Base UI](https://base-ui.com)

A few decisions that explain the shape of the code:

- **The domain is pure and runs on both sides.** `src/domain/` imports nothing
  from Node or the browser, so the only thing that travels from the server is
  the list of people — the agenda, the next birthday and the countdown are all
  computed in the browser, which is why the countdown ticks every second without
  asking anyone.
- **Date arithmetic is hand-rolled**, not delegated to a date library. `MesDia`
  is a day and month with no year; `FechaSimple` is a calendar day with no time
  and no zone. `Date` appears in exactly two functions.
- **Portraits are copied, never hot-linked.** LinkedIn's image URLs are signed
  and expire. The download blocks private-network addresses and re-validates on
  every redirect, because a server-side fetch of a user-supplied URL is SSRF, and
  the administrator pasting a link somebody sent them is enough to trigger it.
- **The server is server functions, not route handlers.** Which means every
  handler touching admin data calls `exigirAdministrador()` *inside the handler*
  — a server function is a directly invocable HTTP endpoint, so a route guard
  does not protect it.
- **February 29th** is observed on March 1st in non-leap years.

The reasoning behind the hard-to-reverse ones is recorded in
[`docs/adr/`](docs/adr/) — eight decisions, each with the alternative that was
rejected and why.

## Documentation

| File | What it holds |
| --- | --- |
| [`CONTEXT.md`](CONTEXT.md) | The domain glossary. Read it before naming anything. |
| [`PRODUCT.md`](PRODUCT.md) | Who it is for, and what it deliberately is not. |
| [`docs/adr/`](docs/adr/) | Eight architectural decisions, with their reasoning. |
| [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) | Step-by-step Coolify deployment. |
| [`CLAUDE.md`](CLAUDE.md) | Working notes for AI coding agents — also the fastest tour of the traps. |

## The demo

The [live demo](https://santidotpy.github.io/birthday-tracker/) is the same app
built with `VITE_DEMO=1`, which swaps three modules — the data source, the theme
resolver and the session — and nothing else. It is served from GitHub Pages out
of `main`, so it cannot drift from the code. There is no `demo` branch.

Its cast is historical figures and famous people; the names and dates are facts
and the portraits are deliberately absent, so every avatar is the initials
fallback doing its job.

Two things worth trying:

- `?hoy=2027-09-05` pins "today", because with forty people spread across the
  year you would otherwise see the countdown and never the confetti.
- `?hoy=2027-03-01` shows Rossini, born February 29th, celebrating on March 1st
  in a non-leap year.

The admin panel is not part of the demo: it writes to SQLite and downloads
portraits, both of which need a server. `/entrar` still renders, and says so.

Build it yourself with `pnpm build:demo` — the output lands in `dist/client`.

## Development

```sh
pnpm dev          # Vite on :3000
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm build && pnpm start
```

Tests run in Node with no browser; component tests use `renderToStaticMarkup`.
