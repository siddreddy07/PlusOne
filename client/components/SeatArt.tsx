// A small picture of a seat map, for the login screens. Decoration only.
// It shows what the app does: a stage, rows of seats, and four seats picked in red.

const ROWS = 9
const COLUMNS = 15 // column 7 is the aisle

function seatLook(row: number, column: number) {
  // four seats picked in a row, like a booking in progress
  if (row === 5 && column >= 3 && column <= 6) return "bg-primary"
  // some seats already taken (darkest)
  if ((row * 7 + column * 3) % 5 === 0) return "bg-[var(--seat-taken)]"
  // the rest are free (two greys so the grid does not look flat)
  return (row + column) % 3 === 0
    ? "bg-[var(--seat-free-2)]"
    : "bg-[var(--seat-free-1)]"
}

export function SeatArt() {
  const rows = Array.from({ length: ROWS }, (_, row) => row)
  const columns = Array.from({ length: COLUMNS }, (_, column) => column)

  return (
    <div aria-hidden="true" className="w-full max-w-md">
      {/* the stage */}
      <div
        className="mx-auto mb-8 h-8 w-4/5 bg-gradient-to-b from-[var(--stage-from)] to-[var(--stage-to)]"
        style={{ clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0 100%)" }}
      />

      {/* the seats */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
      >
        {rows.map((row) =>
          columns.map((column) =>
            column === 7 ? (
              <span key={`${row}-${column}`} />
            ) : (
              <span
                key={`${row}-${column}`}
                className={`aspect-square rounded-[3px] ${seatLook(row, column)}`}
              />
            )
          )
        )}
      </div>
    </div>
  )
}
