import "dotenv/config";
import express from "express";
import photosRouter from "./routes/photos";
import prisma from "./lib/prisma";

const app = express();
const port = process.env.PORT ?? 3001;

app.use("/photos", photosRouter);

const server = app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
