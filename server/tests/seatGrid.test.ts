import { describe, expect, it } from "vitest";
import { makeSeatList } from "../src/helpers/seatGrid.js";

describe("makeSeatList", () => {
  it("10 rows x 12 seats = 120 seats, from A1 to J12", () => {
    const list = makeSeatList(10, 12);

    expect(list).toHaveLength(120);
    expect(list[0]).toEqual({ rowLabel: "A", seatNumber: 1 });
    expect(list[119]).toEqual({ rowLabel: "J", seatNumber: 12 });
  });

  it("lists seats row by row", () => {
    const names = makeSeatList(2, 3).map((seat) => `${seat.rowLabel}${seat.seatNumber}`);

    expect(names).toEqual(["A1", "A2", "A3", "B1", "B2", "B3"]);
  });

  it("an empty grid gives no seats", () => {
    expect(makeSeatList(0, 5)).toHaveLength(0);
    expect(makeSeatList(5, 0)).toHaveLength(0);
  });

  it("26 rows ends at row Z", () => {
    const list = makeSeatList(26, 1);

    expect(list[25]).toEqual({ rowLabel: "Z", seatNumber: 1 });
  });
});
