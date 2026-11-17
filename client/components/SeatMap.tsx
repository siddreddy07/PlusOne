import type { Seat } from "@/lib/api"

type Props = {
  seats: Seat[]
  selected: number[] // seat ids the user has picked but not held yet
  locked: boolean // true when picking is not allowed (seats already held, or organizer)
  onToggle: (seatId: number) => void
}

// The stage on top, then one line of seats per row.
export function SeatMap({ seats, selected, locked, onToggle }: Props) {
  // group the seats by their row letter: { A: [...], B: [...] }
  const rows: Record<string, Seat[]> = {}
  for (const seat of seats) {
    if (!rows[seat.rowLabel]) {
      rows[seat.rowLabel] = []
    }
    rows[seat.rowLabel].push(seat)
  }
  const seatsPerRow = Math.max(...Object.values(rows).map((row) => row.length), 1)

  return (
    <div className="mx-auto w-full" style={{ maxWidth: `${seatsPerRow * 46 + 64}px` }}>
      <div
        className="mx-auto h-3 w-4/5 rounded-b-[100%] shadow-[0_8px_30px_-6px_var(--stage-to)]"
        style={{ backgroundImage: "linear-gradient(to bottom, var(--stage-from), var(--stage-to))" }}
        aria-hidden="true"
      />
      <p className="mt-2 mb-8 text-center text-sm tracking-widest text-muted-foreground uppercase">Stage</p>

      <div className="flex flex-col gap-2">
        {Object.entries(rows).map(([label, rowSeats]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-5 text-center text-sm text-muted-foreground" aria-hidden="true">
              {label}
            </span>

            <div
              className="grid flex-1 gap-1.5"
              style={{ gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))` }}
            >
              {rowSeats.map((seat) => (
                <SeatButton
                  key={seat.id}
                  seat={seat}
                  picked={selected.includes(seat.id)}
                  locked={locked}
                  onToggle={onToggle}
                />
              ))}
            </div>

            <span className="w-5 text-center text-sm text-muted-foreground" aria-hidden="true">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SeatButton({
  seat,
  picked,
  locked,
  onToggle,
}: {
  seat: Seat
  picked: boolean
  locked: boolean
  onToggle: (seatId: number) => void
}) {
  const name = `${seat.rowLabel}${seat.seatNumber}`
  const isMine = seat.mine && seat.status !== "available"
  const isTaken = seat.status !== "available" && !seat.mine
  const canPick = seat.status === "available" && !locked

  let state = "available"
  if (isMine) state = seat.status === "booked" ? "booked by you" : "held for you"
  else if (isTaken) state = "taken"
  else if (picked) state = "selected"

  const red = picked || isMine
  const colour = red
    ? "bg-primary"
    : isTaken
      ? "bg-[var(--seat-taken)]"
      : "bg-[var(--seat-free-1)] hover:bg-[var(--seat-free-2)]"

  return (
    <button
      type="button"
      disabled={!canPick}
      aria-pressed={picked}
      aria-label={`Seat ${name}, ${state}`}
      title={name}
      onClick={() => onToggle(seat.id)}
      className={`flex aspect-square w-full items-center justify-center rounded-t-lg rounded-b-sm outline-none transition-all duration-150 focus-visible:ring-3 focus-visible:ring-ring/70 motion-reduce:transition-none ${colour} ${
        canPick ? "cursor-pointer" : "cursor-not-allowed"
      } ${red ? "z-10 scale-110 shadow-[0_0_16px_-2px] shadow-primary/70 motion-reduce:scale-100" : ""} ${
        seat.status === "booked" && isMine ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {/* the seat's own name, like D3, on seats that are yours (too small to read on a phone) */}
      {red && (
        <span className="hidden text-[11px] leading-none font-bold text-primary-foreground sm:block">{name}</span>
      )}
    </button>
  )
}
