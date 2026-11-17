import { app } from "./app.js";
import { PORT } from "./config/env.js";
import { getNow } from "./helpers/clock.js";
import { releaseExpiredHolds } from "./services/holdService.js";

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Every 30 seconds, free the seats whose hold has run out.
// (The seat map and booking also do this on their own, so this is just cleanup.)
setInterval(async () => {
  try {
    const released = await releaseExpiredHolds(getNow());
    if (released > 0) {
      console.log(`Released ${released} expired hold(s)`);
    }
  } catch (error) {
    console.log("release expired holds error:", error.message);
  }
}, 30 * 1000);
