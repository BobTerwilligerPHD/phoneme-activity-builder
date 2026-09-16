# Phoneme Activity Builder

CSE3CWA Assessment 2

## Overview

This project extends the Assessment 1 frontend for Speech Pathology teachers and students. Teachers can store phoneme-based word lists and save settings for Wordle and Word Search activities.

Both builders use stored database data to generate playable previews and standalone HTML downloads. Downloaded HTML files are self-contained and run in a browser without the application server or an internet connection. The application runs locally or in Docker.

## Main features

- Create, read, update and delete word lists and words.
- Store ordered phonemes, including multi-character symbols such as `tʃ`, `dʒ`, `ɜː` and `əʉ`.
- Save Wordle and Word Search configurations, then generate database-driven previews and standalone HTML files.
- Validate API input and return consistent, safe error responses.
- Check database connectivity through `/health`.
- Run in Docker with persistent SQLite storage.
- Switch between light and dark themes.
- Use keyboard navigation, visible focus indicators, labelled forms and keyboard-operated Word Search selection.

## Technology stack

Versions below come from the package lockfile and Dockerfile.

| Technology                | Version                                     | Role                                            |
| ------------------------- | ------------------------------------------- | ----------------------------------------------- |
| Next.js                   | 16.3.0                                      | App Router pages and API route handlers         |
| React                     | 19.2.8                                      | Interactive components and form state           |
| TypeScript                | 6.0.3                                       | Application types                               |
| Prisma ORM and Client     | 7.10.0                                      | Database queries and committed migrations       |
| SQLite                    | Via `@prisma/adapter-better-sqlite3` 7.10.0 | File-based database                             |
| Tailwind CSS              | 4.3.3                                       | Styling and responsive layouts                  |
| Docker and Docker Compose | Node image `24.16.0-bookworm`               | Container build, startup and persistent storage |

Pages and API handlers use Next.js App Router conventions (Vercel, 2025). Interactive forms and previews use React components and Hooks (Meta Platforms, Inc., n.d.).

## Prerequisites

- Node.js 24.x and npm. Docker uses Node.js 24.16.0. The installed Prisma package accepts Node.js 20.19+ within 20.x, 22.12+ within 22.x, or 24+, while Next.js requires at least 20.9.
- Internet access for dependency installation, Prisma engine downloads and the Google Fonts fetched during the Next.js build.
- For Docker: Docker Desktop running Linux containers, with Docker Compose available. Local Node.js is not needed for this workflow.

Run commands from the repository root. Use either local startup or Docker on port 3000 at a time. On Windows PowerShell, use `npm.cmd` and `npx.cmd` if execution policy blocks the `.ps1` commands.

## Environment setup

For local development, copy `.env.example` to `.env`. Do not overwrite an existing environment file.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```sh
cp .env.example .env
```

The template contains only:

```dotenv
DATABASE_URL=file:./dev.db
```

`DATABASE_URL` selects the SQLite database file. With commands run from the repository root, this value uses `dev.db` in that directory. The Prisma configuration and application adapter read the same variable. Real `.env` files and local `.db` files are excluded from Git; `.env.example` is trackable.

Docker receives `DATABASE_URL=file:/app/data/phoneme-builder.db` directly from Compose. It does not use the local `.env` database.

## Local installation and startup

1. Complete the environment setup above.
2. Install the locked dependencies:

   ```sh
   npm ci
   ```

3. Generate the client at the schema's configured output location:

   ```sh
   npx prisma generate --config prisma7.config.ts
   ```

4. Apply the committed migration:

   ```sh
   npx prisma migrate deploy --config prisma7.config.ts
   ```

5. Start the development server:

   ```sh
   npm run dev
   ```

Open [the application](http://localhost:3000) and [the health endpoint](http://localhost:3000/health). The committed migration creates the database structure. There is no automatic seed data; create your own lists through [Word Lists](http://localhost:3000/word-lists).

## Production build

Prepare the environment, generate the Prisma client and apply migrations first, then run:

```sh
npm run lint
npm run build
npm run start
```

The production server uses the same database environment variable and listens on port 3000. Stop a local server with Ctrl+C.

## Docker

Compose defines the application service and its named volume (Docker Inc., n.d.).

```sh
docker compose up --build -d --wait
docker compose ps
docker compose logs
```

Open [the application](http://localhost:3000) or [the health endpoint](http://localhost:3000/health). The image installs dependencies with `npm ci`, generates Prisma Client and builds Next.js. The entrypoint runs `prisma migrate deploy` before starting the production server.

SQLite is stored at `/app/data/phoneme-builder.db` in the Compose-managed `phoneme-data` volume. Recreating the container preserves records while this volume remains. The volume does not cover the schema or migrations.

Normal shutdown preserves data:

```sh
docker compose down
```

**Destructive reset:** the following also removes the named database volume and deletes all container-stored application data:

```sh
docker compose down -v
```

## Application workflow

1. Open **Word Lists**, create a list and add words, optional hints and ordered phonemes.
2. Open **Wordle** or **Word Search**, then create or load an activity configuration.
3. Select the saved list and adjust settings. For Wordle, also select a stored target word.
4. Save the settings, generate a preview and download the standalone HTML.

Word Search uses the selected list. Wordle uses one selected word from that list. An Activity stores the linked list and settings, but not the Wordle target word. Target selection applies to the generated output and must be selected again when loading a configuration.

## Database design

Prisma defines the models and relationships, and SQLite stores the records in a local file (Prisma, n.d.; SQLite, n.d.).

| Model      | Purpose                                             | Important relationships                                  |
| ---------- | --------------------------------------------------- | -------------------------------------------------------- |
| `WordList` | Named collection with an optional description       | Contains many Words and Activities                       |
| `Word`     | Written text and an optional hint                   | Belongs to one WordList; contains many Phonemes          |
| `Phoneme`  | A symbol string and its zero-based `position`       | Belongs to one Word; position is unique within that word |
| `Activity` | Title, activity type, difficulty and saved settings | Belongs to one WordList                                  |

Phoneme responses are ordered by `position`. Each symbol is stored as a complete string, so multi-character IPA symbols remain intact. Word text is unique within its list.

Wordle uses `maxGuesses`; Word Search uses `gridRows` and `gridColumns`. The settings for the other activity type are stored as `null`. Deleting a WordList cascades to its Words, their Phonemes and its Activities. Deleting a Word cascades to its Phonemes. Deleting an Activity leaves its list intact.

## API endpoints

Send JSON request bodies for POST and PATCH. Successful resource responses are JSON; successful DELETE responses have no body.

| Method | Endpoint                     | Purpose                                      | Successful status |
| ------ | ---------------------------- | -------------------------------------------- | ----------------- |
| GET    | `/health`                    | Check database connectivity                  | 200               |
| GET    | `/api/word-lists`            | List word lists, most recently updated first | 200               |
| POST   | `/api/word-lists`            | Create a word list                           | 201               |
| GET    | `/api/word-lists/[id]`       | Retrieve one list with words and phonemes    | 200               |
| PATCH  | `/api/word-lists/[id]`       | Partially update a list                      | 200               |
| DELETE | `/api/word-lists/[id]`       | Delete a list and its dependent records      | 204               |
| POST   | `/api/word-lists/[id]/words` | Create a word in a list                      | 201               |
| GET    | `/api/words/[id]`            | Retrieve a word with ordered phonemes        | 200               |
| PATCH  | `/api/words/[id]`            | Partially update a word                      | 200               |
| DELETE | `/api/words/[id]`            | Delete a word and its phonemes               | 204               |
| GET    | `/api/activities`            | List activities, most recently updated first | 200               |
| POST   | `/api/activities`            | Create an activity                           | 201               |
| GET    | `/api/activities/[id]`       | Retrieve an activity and its linked list     | 200               |
| PATCH  | `/api/activities/[id]`       | Partially update an activity                 | 200               |
| DELETE | `/api/activities/[id]`       | Delete an activity                           | 204               |

List responses include words and ordered phonemes. Activity responses include the linked list with its words and phonemes. Supplying `phonemes` in a word PATCH replaces the complete sequence transactionally; omitting it preserves the existing records.

API errors use HTTP 400 for malformed JSON or invalid input, 404 for unknown records, 409 for uniqueness conflicts such as duplicate word text in a list, and a generic safe 500 for unexpected failures. List and Activity handlers also map Prisma uniqueness errors to 409, but their names and titles are not unique in the current schema.

Example validation error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The word list data is invalid.",
    "details": ["Name is required."]
  }
}
```

`details` is an optional array of strings. The health endpoint has its own response shape, shown below.

## Validation summary

| Input                      | Rules                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| List name / word text      | Required on creation; 1 to 100 characters after trimming                                            |
| Description / hint         | Optional string or `null`; at most 500 characters after trimming                                    |
| Phonemes                   | Required on word creation; 1 to 20 strings, each trimmed and containing 1 to 10 Unicode code points |
| Activity                   | Required title (1 to 100 trimmed characters), existing `wordListId`, type and difficulty            |
| Activity type / difficulty | `WORDLE` or `WORD_SEARCH`; `EASY`, `MEDIUM` or `HARD`                                               |
| Wordle guesses             | Integer from 1 to 10; defaults to 6                                                                 |
| Word Search dimensions     | Each dimension is an integer from 5 to 20; defaults to 10 by 10                                     |
| Hint / answer-key settings | Booleans; default to `true` / `false` respectively                                                  |
| Output filename            | `null` or 1 to 100 trimmed characters; no `/` or `\` path separators                                |

Unsupported fields and PATCH bodies without supported fields are rejected. API requests must contain JSON objects. The builders also check whether the selected data can produce the requested puzzle.

## Project structure

```text
app/                 Pages, root layout and styles
  api/               Word-list, word and Activity routes
  components/        Shared UI and activity setup
  lib/               Prisma connection, validation and puzzle utilities
  word-lists/        Teacher-facing list and phoneme editor
  wordle/            Wordle builder
  word-search/       Word Search builder
  health/            Database health route
prisma/              Schema and committed migrations
prisma7.config.ts    Prisma CLI configuration
Dockerfile           Production image build
compose.yaml         Service and persistent volume
docker-entrypoint.sh Startup migration deployment
.dockerignore        Docker build-context exclusions
```

## Health check

`GET /health` executes `SELECT 1` against the database. A successful query returns HTTP 200:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-16T00:00:00.000Z"
}
```

The timestamp above is illustrative; each response contains the current ISO timestamp. A failed query returns HTTP 503 with `status: "error"`, `database: "disconnected"` and a timestamp, without internal error details. Docker requests this endpoint to determine container health.

## Repository

[Phoneme Activity Builder on GitHub](https://github.com/BobTerwilligerPHD/phoneme-activity-builder). Assessment 2 work is on the `assessment-2-backend` branch.

## References

Docker Inc. (n.d.). _Docker Compose_. Docker Docs. https://docs.docker.com/compose/

Meta Platforms, Inc. (n.d.). _React reference overview_. React. https://react.dev/reference/react

Prisma. (n.d.). _Prisma 7_. https://www.prisma.io/docs/orm/v7

SQLite. (n.d.). _SQLite documentation_. https://www.sqlite.org/docs.html

Vercel. (2025, July 30). _App Router_. Next.js. https://nextjs.org/docs/app
