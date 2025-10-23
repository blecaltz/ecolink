import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema({
  category: String,
  prompt: String,
  analysisResult: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Analysis", analysisSchema);
