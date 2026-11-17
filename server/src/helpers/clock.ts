// The app asks THIS file for the current time, never new Date() directly.
// Why: tests can freeze the time with setFixedNow() to prove things like
// "the hold expired exactly after 5 minutes".

let fixedNow: Date | null = null;

export function getNow(): Date {
  return fixedNow ?? new Date();
}

// For tests only
export function setFixedNow(date: Date) {
  fixedNow = date;
}

// For tests only
export function clearFixedNow() {
  fixedNow = null;
}
