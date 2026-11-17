# Event Seat Booking — the whole flow, explained

This file is for understanding and for explaining the project out loud (for example in an interview). It goes from top to bottom: what the app is, how a request travels through it, how a booking happens, how double booking is stopped, and what we traded off along the way. It does not list individual functions.

> A note on words: "row locking" below means the lock Postgres puts on a table row while one transaction is changing it.

---

## 1. The one-minute story

Attendees book seats for an event. Two people must **never** end up with the same seat, even if they click at the same moment. While an attendee is paying, their seats are **held** for a short time (5 minutes by default). If they do not finish, the seats are **released**. Organizers create events and change the rules (hold time, most seats per booking).

The hard part is not the screens. The hard part is: *what happens when two people click the same seat in the same millisecond?* The answer is in the database, and most of this file is about that.

---

## 2. The big picture

```
 Browser (Next.js, React)                 Server (Express, TypeScript)              Database (Neon Postgres)
 ───────────────────────                  ────────────────────────────              ────────────────────────
 pages + zustand stores   ── HTTPS ──▶    routes ▶ login/role check ▶               users, events, seats,
 draw what the server     ◀── JSON ───    controllers ▶ services (the rules) ──▶    bookings, booking_seats,
 says; never decide                                                                 settings
 anything important                       a 30-second timer frees expired holds
```

Three layers, each with one job:

| Layer | Job | What it must NOT do |
|---|---|---|
| Browser | Show things, collect clicks | Decide who gets a seat |
| Server | Check who you are, apply the rules | Trust the browser |
| Database | Store the truth and refuse impossible states | Rely on the server being correct |

That last row matters. The database has its own guards, so even a bug in the server cannot create a double booking.

---

## 3. Who is who (login and roles)

- Two roles: **attendee** and **organizer**. Sign-up only ever makes attendees. The organizer is created by the seed.
- Passwords are never stored. Only a one-way **bcrypt hash** is stored, and login compares the typed password against the hash.
- After login the server gives the browser a signed token (valid one day) inside an **httpOnly cookie**. Browser JavaScript cannot read it. The browser sends it back automatically on every request.
- Every protected route first checks the token, then checks the role. So "only organizers can create events or change settings" is enforced on the **server**. Hiding a button in the screen is only a courtesy.
- Login messages are deliberately specific: an unknown email says "No account exists for this email", and a wrong password says "Wrong email or password".

**Trade-off — cookie vs localStorage token.** We first stored the token in localStorage and then moved to a cookie.
- *localStorage:* simple, but any script on the page can steal it.
- *httpOnly cookie:* script cannot read it, which is safer against XSS. The cost: the cookie needs `sameSite=none` + `secure` because the site and API run on different addresses, the API must allow the exact frontend origin with credentials, and a cookie is sent automatically, so cross-site request forgery becomes something to think about.

---

## 4. What is stored (the data model, in words)

| Table | Holds |
|---|---|
| users | name, email, password hash, role |
| events | name, description, date, venue, rows, seats per row |
| seats | one row per physical seat: which event, row letter, seat number, **status** (available / held / booked), and which booking owns it |
| bookings | who, which event, **status** (held / confirmed / cancelled), when the hold ends |
| booking_seats | which seats a booking had (the history record) |
| settings | the organizer's numbers: hold minutes, max seats per booking |

Why `booking_seats` exists: a seat's owner is cleared when it is released, but a *paid then cancelled* booking must still be able to say which seats it had. So the history lives in its own table.

Creating an event also creates **all its seats** (for example 10 rows × 12 = 120) in the same transaction. If anything fails, nothing is saved, so there is never an event without seats.

---

## 5. The booking journey, top to bottom

### Step 1 — Home: the events list
The browser asks for all events. The server returns each event with how many seats it has and how many are still available. Each card shows a bar and "85 of 120 seats free". A loading skeleton, an empty message and an error with "Try again" are all handled.

### Step 2 — The seat map
Opening an event loads the event, every seat with its status, and the settings (to know the seat limit). The map shows available, taken and **yours** (red). The server never reveals who owns another person's seat. It only says "taken", plus a flag "this one is mine".

The map **refreshes every 20 seconds** so you see what other people did (the project brief asks for this). Your own actions refresh it instantly.

### Step 3 — Picking seats
Picking is only a **local** choice in the browser. Nothing is reserved yet. Picked seats show their name (like D3) and glow. The side panel says only how many you picked. The seat limit (default 4) is checked here for comfort and again on the server for safety.

### Step 4 — "Buy ticket" = hold the seats
This is the moment that matters. The browser asks the server to hold the picked seats. The server (inside one transaction):
1. clears any holds that already ran out,
2. checks the event exists and the seat count is within the limit,
3. creates a booking marked *held* with an expiry time (now + hold minutes from settings),
4. tries to claim **all** the seats in **one** conditional statement (explained in section 6),
5. if even one seat was lost to someone else, it **throws, and everything rolls back**,
6. otherwise records which seats belong to the booking.

If it fails, the user sees "Some of these seats were just taken. Please pick other seats." and the map refreshes.

### Step 5 — Payment (a mock)
The project has no real payments, so the panel shows a countdown and two buttons that stand in for the payment result:
- **Payment success** → the booking becomes *confirmed* and the seats become *booked*. The server first re-checks that the hold has not expired and is still held.
- **Cancel payment** → the seats are freed and the booking is **deleted**. Nothing is kept.
- **Do nothing** → when the timer ends, the seats are freed and the booking is deleted the same way.

A reload does not lose the hold: the page asks for the user's bookings, finds the live hold for this event, and shows the payment panel again with the time left.

### Step 6 — My bookings
Shows paid bookings, newest first, with their seats. A paid booking can be cancelled (with an "are you sure?" step). That frees the seats and keeps the booking in the list as **Cancelled**. A booking still in payment shows "Finish payment".

**Rule we chose:** an unfinished or cancelled *payment* leaves no trace; only a *paid, then cancelled* booking is remembered.

---

## 6. Double-booking prevention and row locking (the core)

### The problem
Two people, A and B, click the last seat at the same instant. A naive server would do "check if free → then mark as taken". Both checks can run before either update, both see "free", and both win. That is a **race condition**.

### The fix: check and claim in ONE statement
Instead of "look, then change", the server sends a single instruction to the database:

> "Mark these seats as held by my booking, **but only those that are still available**, and tell me which ones you changed."

The check and the change happen together, so there is no gap between them.

### What the row lock does
When Postgres changes a row, it puts a **row lock** on it until the transaction ends.

```
Time ─────────────────────────────────────────────────────────▶

A:  start ── claim seat 7 (row locked) ───────── commit ──▶ seat 7 = A's
B:  start ── claim seat 7 ── WAITS for the lock ──────────── (lock freed)
                                                    B re-checks: seat 7 is no longer
                                                    available → changes 0 rows → fails
```

B is not rejected at the start. B **waits**, then re-checks the row after A commits, finds it is no longer available, and changes nothing. The server sees "I asked for 1 seat and got 0" and fails B cleanly.

### All or nothing
If someone picks 3 seats and only 2 are won, the server compares "seats asked for" with "seats actually claimed". They differ, so it throws, and the **transaction rolls back**. The 2 seats that were claimed go back too. Nobody ever ends up with a half-held set.

### Avoiding deadlock
A deadlock would be: A holds seat 1 and waits for seat 2, while B holds seat 2 and waits for seat 1, forever. We prevent it by always claiming seats in **sorted order**, and by claiming them all in **one** statement. Everyone locks in the same order, so nobody can wait on someone who is waiting on them. This is tested with people picking the same seats in opposite order.

### Guards at the storage level (not only in code)
The brief says the rule must hold in the database, not only in the screen. The database has its own rules that refuse bad data no matter what the server does:
- A check that says: a seat that is not available **must** belong to a booking, and an available seat **must not**.
- A unique rule so a seat position (event + row + number) exists only once.
- Fixed lists (enums) for the seat status, booking status and role, so a typo cannot become a status.

A test goes around the server code entirely and tries to double-claim directly. The database refuses.

### Why the interface cannot bypass it
The browser only *asks*. It can send any request it likes (even a forged one), but the decision is made by the server and enforced by the database. Hiding a taken seat in the screen is never the protection. The lock is.

---

## 7. Expired holds and the clock

A hold must end on time even if no one is looking. Three things free expired holds:
1. A **30-second timer** on the server.
2. Every time the **seat map** is loaded.
3. Every time someone tries to **hold** seats (so a freshly expired seat can be taken right away).

All three use the same rule, and each is safe to run any number of times. It first "claims" only bookings that are *still held and past their time*, so a payment that succeeded a moment ago is never touched.

**Fixed clock for testing.** The current time is passed *into* the rules instead of the rules reading the clock themselves. In tests the clock is frozen and moved by hand: a hold made at 10:00 is still alive at 10:04:59 and gone at 10:05:00. That proves it releases on time without waiting five real minutes.

The browser countdown is only a display. The server decides when a hold is over.

---

## 8. Settings (no code change needed)

The hold time and the maximum seats per booking live in the database, not in the code. The server **reads them every time** (no cache), so when an organizer saves a new value, the **next** booking uses it immediately, with no restart. The server also keeps each value inside a sensible range (for example hold time 1–60 minutes).

---

## 9. The organizer side

- A separate log-in page. An attendee account is refused there ("This account is not an organizer").
- **New event** form: name, description, date and time, venue, rows, seats per row. It checks the same rules as the server (date in the future, grid not empty, sane maximums) before sending, and shows the server's message if it still fails.
- **Settings** card for the two numbers.
- Organizers can open a seat map but cannot book.

---

## 10. Frontend structure and state

- **Next.js** pages: one folder per page (login, sign up, organizer, events, bookings).
- **zustand** keeps shared state in small stores: who is logged in, the events list, the seat page (map, picked seats, hold, errors), the bookings list and the settings. Pages stay thin and just read from the stores.
- One small place makes all server calls, so no page writes its own network code.
- Forms check on submit, show errors under the right field, and move focus to the first wrong field.
- Dark theme by default, light theme too, toggled with the **d** key. Red is used only for what you are choosing (your seats) and the main button.
- Works from phone width up. On a phone the seat map scrolls sideways inside its card so seats stay a comfortable size.
- The login screen has **one-click demo buttons** for an attendee and an organizer.

---

## 11. Testing: what is proven

Tests run against a separate Neon **test** branch (they wipe tables, and refuse to run on the real database).
- Two people competing for the same seat: exactly one wins (repeated many times).
- Many users scrambling, overlapping seat sets, and opposite-order picks: no double booking, no deadlock.
- The database itself refuses a double claim even if the server code is skipped.
- Holds expire exactly on time (fixed clock), and a confirmed booking never expires.
- Cancelling during payment keeps nothing; cancelling a paid booking keeps it as cancelled.
- Changing a setting changes behaviour with no code change.
- Roles are enforced on the server.

The full run takes a few minutes because the database is in the cloud.

---

## 12. Trade-offs, in one table

| Decision | What we chose | The alternative | Why we chose it |
|---|---|---|---|
| Stopping double booking | One conditional update + Postgres row lock | App-level lock, Redis lock, or "read then write" | The database is already the single source of truth; no extra service; the guard cannot be skipped |
| Many seats in one go | Claim all in one statement, roll back if short | Claim one by one | All-or-nothing with no half-held seats |
| Deadlock | Sorted seat order, one statement | Retry on deadlock | Prevents it instead of recovering from it |
| Optimistic vs pessimistic | Let the database serialise the clash | Version numbers and retry | Simpler; contention is only on the same seat |
| Hold then confirm | Two steps with an expiry | Book instantly | Gives the user time to pay without blocking the seat forever |
| Expiry | Timer **plus** release on every read | Timer only | A seat frees the moment someone needs it; the timer is just cleanup |
| Seeing others' changes | Poll every 20 s | Server-sent events or websockets | Much simpler; the cost is up to 20 s of delay. Correctness never depends on it |
| Cancelled payments | Delete the booking | Keep as "cancelled" | History stays meaningful: only paid bookings are remembered |
| Login token | httpOnly cookie | localStorage | Safer against script theft; needs CORS credentials and cross-site cookie settings |
| Settings | Read from the database every time | Cache in memory | Changes apply at once; one tiny query is cheap |
| Time | Passed into the rules | Read the clock inside | Lets tests freeze and move time |
| Code style | Plain functions and plain `throw` / `try-catch` | Classes, custom error types | Easy to read and follow |
| Frontend state | zustand stores | Local state only | Shared state (user, seats, bookings) stays in one place |
| Payment | A mock with Success / Cancel buttons | Real payment gateway | The brief has no payments; the buttons let anyone test both outcomes |

---

## 13. Questions you may be asked (and short answers)

**Where is the double-booking check enforced, and why can't the interface bypass it?**
In the database. The seat is claimed with one conditional update under a row lock, and constraints back it up. The screen only asks; the server decides; the database refuses anything impossible.

**What if two people click the same seat at the same moment?**
Postgres locks the seat row for the first. The second waits, re-checks after the first commits, finds the seat is no longer available, changes nothing, and gets "just taken".

**What if one person picks three seats and one is gone?**
The count of claimed seats differs from the count requested, so the server throws and the transaction rolls back. The other two seats are released too.

**How do you avoid deadlock?**
Seats are always claimed in sorted order in a single statement, so nobody waits on someone who is waiting on them.

**What if the server restarts while a hold is active?**
Nothing is lost. The hold and its expiry time are in the database. The timer is only cleanup; holds are also released when anyone loads the map or books.

**How do you prove holds expire on time?**
The time is passed into the rules, so a test freezes the clock and moves it: alive at 10:04:59, released at 10:05:00.

**Why does the map poll?**
The brief asks the map to refresh so people see others' changes. Polling is the simplest way. It is not needed for correctness.

**How would you scale it?**
The lock only affects the same seats, so different events and different seats do not block each other. For more users: a connection pool is already used, polling could become server-sent events, and the expiry timer could run as a separate worker.

---

## 14. Honest limits

- The map can be up to 20 seconds behind (polling, not live push).
- Payment is a mock, not a real gateway.
- No rate limiting on the login or booking routes.
- There is no screen to edit an existing event (the server supports it).
- The tests need a separate cloud test database and take a few minutes.
- On a phone, a wide seat map scrolls sideways instead of fitting on screen.
