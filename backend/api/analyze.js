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
- Condição: (novo, usado, com danos)
- Veredito: (é possível consertar? qual provável problema?)
Se a imagem for ruim, diga: "A imagem não é clara o suficiente para diagnóstico preciso."
`;

    console.log("🧩 Enviando imagem para o Gemini via REST API...");

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: req.file.mimetype,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro da API Gemini: ${response.status} - ${err}`);
    }

    const result = await response.json();

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Não foi possível obter resposta.";

    console.log("✅ Resposta da IA:", text);

    // salva análise
    const newAnalysis = new Analysis({
      category,
      prompt,
      analysisResult: text,
    });
    await newAnalysis.save();

    // salva conversa
    let conversation = await Conversation.findOne({ userId: uid });
    if (!conversation) conversation = new Conversation({ userId: uid, messages: [] });
    conversation.messages.push({ sender: "user", text: `Imagem: ${category}` });
    conversation.messages.push({ sender: "trexinho", text });
    await conversation.save();

    res.json({
      diagnosis: text,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("❌ Erro no endpoint /api/analyze:", error);
    res.status(500).json({
      error: "Erro interno ao processar a imagem",
      details: error.message,
    });
  }
});
