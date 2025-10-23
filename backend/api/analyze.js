// --- REST-based analyze endpoint (replace your existing /api/analyze) ---
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhuma imagem foi enviada." });
    if (!req.file.mimetype.startsWith("image/")) return res.status(400).json({ error: "Arquivo não é imagem." });

    const { category, userId } = req.body;
    const uid = userId || 'anonimo';

    const base64Image = req.file.buffer.toString("base64");

    const prompt = `
Você é o "Tréxinho", assistente técnico especialista em diagnóstico de eletrônicos.
Analise a imagem que mostra um(a) "${category}".
Responda de forma técnica e concisa:
- Tipo: (identifique o aparelho)
- Condição: (ex: novo, com tela trincada, com partes faltando)
- Veredito: (possível consertar? provável peça/causa)
Se a imagem estiver ilegível, responda: "A imagem não é clara o suficiente para diagnóstico preciso."
`;

    console.log("🧩 Enviando imagem para o Gemini via REST API...");

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-2.5-flash"; // altere se sua conta tiver outro modelo autorizado
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

    // Se estiver usando Node < 18, instale node-fetch e importe-o no topo:
    // const fetch = require('node-fetch');
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // formato oficial: contents -> parts com text e inline_data
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: req.file.mimetype,
                  data: base64Image
                }
              }
            ]
          }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(()=>null);
      throw new Error(`Erro da API Gemini: ${resp.status} - ${errText}`);
    }

    const result = await resp.json();

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.candidates?.[0]?.content?.text ||
      "A IA não retornou uma resposta legível.";

    console.log("✅ Resposta da IA:", text);

    // salvar análise
    const newAnalysis = new Analysis({
      category,
      prompt,
      analysisResult: text,
    });
    await newAnalysis.save();

    // salvar conversa
    let conversation = await Conversation.findOne({ userId: uid });
    if (!conversation) conversation = new Conversation({ userId: uid, messages: [] });
    conversation.messages.push({ sender: "user", text: `Imagem: ${category}` });
    conversation.messages.push({ sender: "trexinho", text });
    await conversation.save();

    return res.json({
      diagnosis: text,
      conversationId: conversation._id,
      lastMessages: conversation.messages.slice(-6)
    });

  } catch (error) {
    console.error("❌ Erro no endpoint /api/analyze:", error);
    return res.status(500).json({
      error: "Erro interno ao processar a imagem",
      details: error.message,
    });
  }
});
