const fetch = (...args) => import('node-fetch').then(({default:fetch})=>fetch(...args));

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const path = require('path');

const Analysis = require('./models/Analysis');
const Conversation = require('./models/Conversation'); // novo model (ver abaixo)

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY não encontrada nas variáveis de ambiente!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB conectado com sucesso!"))
  .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhuma imagem foi enviada." });
    if (!req.file.mimetype.startsWith("image/")) return res.status(400).json({ error: "Arquivo não é imagem." });

    const { category, userId } = req.body; 
    const uid = userId || 'anonimo';

    const base64Image = req.file.buffer.toString("base64");
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `
Você é o "Tréxinho", assistente técnico especialista em diagnóstico de equipamentos eletrônicos.
Analise a imagem que mostra um(a) "${category}".
Responda de forma técnica e concisa:
- Tipo: (identifique o aparelho)
- Condição: (ex: novo, com tela trincada, com partes faltando)
- Veredito: (possível consertar? provável peça/causa)
Forneça resposta curta, em até 6 linhas.
Se a imagem estiver ilegível, responda: "A imagem não é clara o suficiente para diagnóstico preciso."
`;

    console.log("🧩 Enviando imagem para o Gemini... (user:", uid, "category:", category, ")");

    const result = await model.generateContent([
  { text: prompt },
  { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
]);
    const response = await result.response;

    const text =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response?.candidates?.[0]?.content?.text ||
      response?.output || 
      null;

    if (!text) {
      const blockReason = response?.promptFeedback?.blockReason || 'Resposta vazia';
      console.error("❌ IA não retornou texto. Motivo:", blockReason);
      return res.status(500).json({
        error: "A resposta da IA foi bloqueada ou retornou vazia.",
        details: blockReason
      });
    }
    console.log(`📸 Imagem recebida (${req.file.mimetype}, ${req.file.size} bytes)`);

    console.log("✅ Resposta da IA:", text);

    const newAnalysis = new Analysis({
      category,
      prompt,
      analysisResult: text,
    });
    await newAnalysis.save();

    let conversation = await Conversation.findOne({ userId: uid });
    if (!conversation) {
      conversation = new Conversation({ userId: uid, messages: [] });
    }
    conversation.messages.push({ sender: 'user', text: `Imagem: ${category}` });
    conversation.messages.push({ sender: 'trexinho', text });
    await conversation.save();

    res.json({
      diagnosis: text,
      conversationId: conversation._id,
      lastMessages: conversation.messages.slice(-6) // últimos 6
    });
  } catch (error) {
    console.error("❌ Erro no endpoint /api/analyze:", error);
    return res.status(500).json({
      error: "Erro interno ao processar a imagem",
      details: error.message || "Erro desconhecido"
    });
  }
});

app.get('/api/conversation/:userId', async (req, res) => {
  try {
    const conv = await Conversation.findOne({ userId: req.params.userId });
    if (!conv) return res.status(404).json({ error: "Conversa não encontrada" });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👉 Acesse a aplicação em http://localhost:${PORT}`);
});
