import app from "./app";
import { recalculateAllElos } from "./lib/elo";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  // Recalculate Elo ratings on startup to ensure consistency
  recalculateAllElos().catch(err => console.error("Elo recalculation failed on startup:", err));
});
