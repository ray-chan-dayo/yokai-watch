import "dotenv/config";
import app from "./app";
import prisma from "./lib/prisma";

const port = process.env.PORT ?? 3001;

const server = app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
