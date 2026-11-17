# Event Seat Booking

Attendees pick seats for an event, hold them for a few minutes while they pay, and confirm. Two people can never get the same seat, even if they click at the same moment.

- **Backend:** `server/` — Node, TypeScript, Express, Drizzle ORM, Neon PostgreSQL
- **Frontend:** `client/` — Next.js (App Router), Tailwind CSS, shadcn/ui, zustand

## Try it (demo logins)

On the login screen there are two one-click buttons, **Log in as demo attendee** and **Log in as demo organizer**. Or type the details in yourself:

| Role | Email | Password | Where to log in |
|---|---|---|---|
| Attendee | `sidd@email.com` | `12345678` | `/login` |
| Organizer | `organizer@example.com` | `password123` | `/organizer/login` |

The seed also creates `attendee1@example.com` to `attendee10@example.com` (password `password123`).

## What you can do

**Attendee**
- See all events and how many seats are still free.
- Open an event, pick up to the allowed number of seats, and press **Buy ticket**. The seats are held and a countdown starts.
- Finish with **Payment success** (the seats are booked) or **Cancel payment** (the seats are released and nothing is saved).
- See **My bookings**, and cancel a paid booking to free its seats.

**Organizer**
- Create an event: name, description, date and time, venue, and a seating grid (rows and seats per row). The date must be in the future and the grid cannot be empty.
- Change the settings: how long seats are held (default 5 minutes) and the most seats in one booking (default 4). A saved change applies to the next booking, with no code change or restart.
- Organizers can look at a seat map but cannot book.

The seat map shows available, held and booked seats and refreshes by itself every 20 seconds, so you see what other people did.

## How double booking is prevented

The rule lives in the **database**, not in the screen:

1. Holding seats is one conditional update inside a transaction:
   `UPDATE seats SET status = 'held', booking_id = … WHERE id IN (…) AND event_id = … AND status = 'available' RETURNING id`.
2. If it returns fewer seats than were asked for, someone else got one first. The server throws and the whole transaction rolls back, so nothing is half held.
3. Postgres row locks make two clicks on the same seat wait for each other, so only one wins. The seat ids are sorted first, so two people picking overlapping seats cannot deadlock.
4. The database backs this up with a CHECK on seats (a seat that is not available must belong to a booking), a unique index on seat position, and enums for the statuses. Even code that skipped the service layer could not double book.

The screen cannot bypass this: it only asks, and the server decides. Roles are checked on the server for every route.

**Expired holds** are released by the server: a 30 second timer, and also whenever the seat map or a booking is loaded. An unpaid or cancelled payment is deleted, not stored. Only a booking that was paid and later cancelled stays in the history as "Cancelled".

## Run it on your computer

You need Node 22+ and a Neon PostgreSQL database.

### 1. Server

```bash
cd server
npm install
```

Copy `.env.example` to `.env.local` and fill it in:

```
DATABASE_URL=         your Neon connection string
PORT=8000
JWT_SECRET=           a long random string
CLIENT_URL=http://localhost:3000
TEST_DATABASE_URL=    a separate Neon "test" branch (only for tests)
```

Then create the tables, fill in the demo data and start:

```bash
npm run db:migrate
npm run seed        # EMPTIES every table, then adds 12 users, 2 events and sample bookings
npm run dev         # http://localhost:8000
```

The seed makes two events (120 seats and 60 seats), 30 sample bookings, the organizer, ten attendees and the demo attendee.

### 2. Client

```bash
cd client
npm install
```

Create `client/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev         # http://localhost:3000
```

Press the **d** key on any screen to switch between the dark and light theme.

## Tests

```bash
cd server
npm test
```

The tests run against the Neon **test** branch (they wipe its tables, and refuse to run against any other database). They prove:

- two people competing for the same seat: only one succeeds (many rounds, plus overlapping seat sets and opposite-order picks with no deadlock)
- the database itself refuses a double claim, even when the service code is skipped
- holds expire exactly on time, using a fixed clock
- cancelling during payment keeps no booking, and cancelling a paid booking keeps it as cancelled
- the settings change the behaviour with no code change
- roles are enforced on the server

The full run takes a few minutes because the database is in the cloud.

## API

| Method and path | Who | What |
|---|---|---|
| `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` | everyone | accounts (the login token is an httpOnly cookie) |
| `GET /auth/me` | logged in | who am I |
| `GET /settings` | logged in | the two settings |
| `PUT /settings/:key` | organizer | change a setting |
| `GET /events`, `GET /events/:id`, `GET /events/:id/seats` | logged in | events and the seat map |
| `POST /events`, `PUT /events/:id` | organizer | create or change an event |
| `POST /bookings/hold` | attendee | hold seats `{ eventId, seatIds }` |
| `POST /bookings/:id/confirm` | attendee | pay: held becomes booked |
| `POST /bookings/:id/cancel` | attendee | release a held booking, or cancel a paid one |
| `GET /bookings/mine` | attendee | booking history |

## Folders

```
server/
  src/
    config/        database connection
    db/            schema and seed
    helpers/       clock, password, token, seat grid
    middleware/    login check and role check
    services/      the business rules (events, seats, holds, bookings, settings)
    controllers/   read the request, call a service, send the answer
    routes/        which URL goes to which controller
  tests/           the concurrency, expiry, storage and role tests
  drizzle/         database migrations
client/
  app/             one folder per page (login, signup, organizer, events, bookings)
  components/      the pieces the pages use (seat map, forms, cards, navbar)
  store/           zustand stores (user, events, seats, bookings, settings)
  lib/             api calls, formatting, login helper
```
