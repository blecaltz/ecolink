// backend/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const cors = require('cors');

// --- Model do MongoDB ---
const Analysis = require('./models/Analysis'); // Vamos criar este arquivo a seguir

// --- Inicialização ---
const app = express();
app.use(cors()); // Habilita o CORS para todas as rotas
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- Configuração do Gemini AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // ou gemini-pro-vision

// --- Configuração do Multer (para upload de arquivos) ---
// Salva a imagem na memória para podermos enviá-la diretamente para a API
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Conexão com o MongoDB ---
console.log("Tentando conectar com a URI:", process.env.MONGO_URI); 

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado com sucesso!"))
  .catch(err => console.error("Erro ao conectar no MongoDB:", err));

// --- Rota Principal da API ---
app.post('/api/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhuma imagem foi enviada." });
        }

        const { category } = req.body; // Pega a categoria do formulário (ex: "Notebook")

        // 1. Preparar a imagem para a API do Gemini
        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };

        // 2. Criar um prompt poderoso e contextualizado
        const prompt = `Você é o "Tréxinho", um assistente especialista em diagnóstico de eletrônicos.
        Analise a imagem deste(a) "${category}" danificado.
        Forneça um diagnóstico claro e objetivo sobre o possível problema.
        Seja amigável e direto. Se não conseguir identificar o problema, diga que a imagem não é clara o suficiente.`;

        // 3. Chamar a API do Gemini
        console.log("Enviando para a IA para análise...");
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const analysisText = response.text();

        // 4. Salvar no MongoDB
        const newAnalysis = new Analysis({
            category: category,
            // Não vamos salvar a imagem em si, apenas o resultado.
            // Em um app real, você salvaria a imagem em um serviço como S3 e guardaria a URL.
            prompt: prompt,
            analysisResult: analysisText,
        });
        await newAnalysis.save();

        console.log("Análise concluída e salva no banco.");

        // 5. Retornar o resultado para o frontend
        res.json({ diagnosis: analysisText });

    } catch (error) {
        console.error("Erro no processo de análise:", error);
        res.status(500).json({ error: "Ocorreu um erro ao analisar a imagem." });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});