import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { paymentsRouter } from "./routes/payments";
import { askRouter } from "./routes/ask";

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api", paymentsRouter);
app.use("/api", askRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`GoldenAnalytics API → http://localhost:${PORT}`);
});
