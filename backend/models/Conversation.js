import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  userId: String,
  messages: [
    {
      sender: String, // "user" ou "trexinho"
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

export default mongoose.model("Conversation", conversationSchema);
