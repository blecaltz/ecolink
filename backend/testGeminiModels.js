// testGeminiModels.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config(); // Carrega as variáveis do arquivo .env

// 1. Pega a chave de API do ambiente
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERRO: Variável de ambiente GEMINI_API_KEY não encontrada.");
  console.log("Por favor, crie um arquivo .env e adicione: GEMINI_API_KEY=SUA_CHAVE_AQUI");
  process.exit(1); // Encerra o script se a chave não for encontrada
}

const genAI = new GoogleGenerativeAI(apiKey);

// 2. Lista de modelos que queremos testar
const modelosParaTestar = [
  "gemini-1.5-flash-latest", // Mais recente, rápido
  "gemini-1.5-pro-latest",   // Mais recente, mais capaz
  "gemini-pro",              // Modelo de texto padrão
  "gemini-pro-vision",       // Modelo de visão legado (para texto e imagem)
  "modelo-que-nao-existe"    // Um modelo falso para vermos o erro
];

// 3. Função assíncrona para testar um único modelo
async function testarModelo(nomeDoModelo) {
  console.log(`\n--- Testando Modelo: ${nomeDoModelo} ---`);
  
  try {
    // 4. Instancia o modelo
    const model = genAI.getGenerativeModel({ model: nomeDoModelo });
    
    // 5. Envia um prompt de texto simples
    const prompt = "Olá, mundo! O que é 2+2?";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ SUCESSO! O modelo "${nomeDoModelo}" funciona.`);
    console.log(`   Resposta: "${text.trim().substring(0, 50)}..."`); // Mostra os primeiros 50 caracteres

  } catch (error) {
    console.error(`❌ FALHA ao testar o modelo "${nomeDoModelo}".`);
    
    // 6. Analisa o tipo de erro
    if (error.message.includes('API key not valid') || error.message.includes('permissionDenied')) {
        console.error("   Erro: Sua chave (API Key) é inválida ou não tem permissão. Verifique seu arquivo .env.");
    } else if (error.message.includes('not found') || error.message.includes('is not supported')) {
        console.error(`   Erro: O modelo "${nomeDoModelo}" não foi encontrado ou não é suportado pela sua conta/região.`);
    } else if (error.message.includes('User location')) {
        console.error("   Erro: Sua localização (região) não é suportada por este modelo.");
    } else {
        console.error("   Erro desconhecido:", error.message.split('\n')[0]); // Mostra só a primeira linha do erro
    }
  }
}

// 7. Roda os testes para todos os modelos da lista
(async () => {
  console.log("Iniciando testes de compatibilidade dos modelos Gemini...");
  for (const modelo of modelosParaTestar) {
    await testarModelo(modelo);
  }
  console.log("\n--- Testes Concluídos ---");
})();