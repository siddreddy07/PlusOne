// Builds the list of seats for a grid.
// makeSeatList(2, 3) gives: A1 A2 A3 B1 B2 B3
// Row labels are letters, so the most rows we support is 26 (A to Z).

export function makeSeatList(rowCount: number, seatsPerRow: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const seatList: { rowLabel: string; seatNumber: number }[] = [];

  for (let row = 0; row < rowCount; row++) {
    for (let seat = 1; seat <= seatsPerRow; seat++) {
      seatList.push({ rowLabel: letters[row]!, seatNumber: seat });
    }
  }

  return seatList;
}
