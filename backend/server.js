import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import analyzeRoute from "./api/analyze.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

app.use("/api/analyze", analyzeRoute);

app.get("/", (req, res) => {
  res.send("🌱 Ecolink API rodando!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
