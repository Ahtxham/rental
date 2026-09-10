// When running the compiled build (dist/), register module-alias so "@/..."
// resolves. In dev, ts-node + tsconfig-paths handles it instead.
if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}

import { connectDB } from "@/config/db";
import { initSocket } from "@/config/socket";
import { JWT_SECRET, PORT } from "@/constants/env";
import { LOGUI } from "@/constants/logs";
import { startJobs } from "@/jobs";
import { initAgencyCacheSync } from "@/services/agency-cache";

import { server } from "./server";

// Validate required environment variables before starting.
// A missing or weak JWT_SECRET makes every token forgeable, fail closed.
if (!JWT_SECRET) {
  console.error("Missing required environment variable: JWT_SECRET");
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.error("Weak secret. JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

// Database setup
connectDB();

// Server setup
const port: number = parseInt(PORT as string, 10) || 4000;
initSocket(server).then(() => {
  server.listen(port, () => {
    console.error(LOGUI.FgYellow, `Serving on port ${port}`);
    // Keeps every instance's settings cache in step, so a change takes effect
    // across the cluster at once rather than one TTL later.
    initAgencyCacheSync();
    // All recurring schedulers (the DB backup) live in src/jobs/
    startJobs();
  });
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(LOGUI.FgRed, error);
});
