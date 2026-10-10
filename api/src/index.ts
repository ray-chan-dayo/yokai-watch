import "dotenv/config";
import express from "express";
import photosRouter from "./routes/photos";

const app = express();
const port = process.env.PORT ?? 3001;

app.use("/photos", photosRouter);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
