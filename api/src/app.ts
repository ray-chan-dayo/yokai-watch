import express from "express";
import cors from "cors";
import monstersRouter from "./routes/monsters";

const app = express();

app.use(cors());

app.use("/monsters", monstersRouter);

export default app;
