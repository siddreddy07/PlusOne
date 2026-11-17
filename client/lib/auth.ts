// The login token lives in an httpOnly cookie set by the server,
// so the browser code never touches it. We only keep the User type here.

export type User = {
  id: number;
  name: string;
  email: string;
  role: "attendee" | "organizer";
};
