import express from "express";
import monstersRouter from "./routes/monsters";

const app = express();

app.use("/monsters", monstersRouter);

export default app;
