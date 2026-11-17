// Saves who is logged in, in the browser (localStorage).
// Only call these from the browser (inside event handlers or useEffect).

export type User = {
  id: number;
  name: string;
  email: string;
  role: "attendee" | "organizer";
};

export function saveLogin(token: string, user: User) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getUser(): User | null {
  const saved = localStorage.getItem("user");
  return saved ? JSON.parse(saved) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
