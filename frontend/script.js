// frontend/script.js

const form = document.getElementById('analysis-form');
const loadingDiv = document.getElementById('loading');
const resultContainer = document.getElementById('result-container');
const diagnosisText = document.getElementById('diagnosis-text');

form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    // Pega os dados do formulário
    const formData = new FormData(form);
    
    // Mostra o loading e esconde o resultado anterior
    loadingDiv.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    form.classList.add('hidden');

    try {
        // Faz a requisição para o nosso backend Node.js
        const response = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            body: formData, // O FormData já formata como multipart/form-data
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const data = await response.json();

        // Exibe o resultado
        diagnosisText.textContent = data.diagnosis;
        resultContainer.classList.remove('hidden');

    } catch (error) {
        console.error("Erro:", error);
        diagnosisText.textContent = "Desculpe, não consegui completar a análise. Tente novamente.";
        resultContainer.classList.remove('hidden');
    } finally {
        // Esconde o loading e mostra o formulário novamente para uma nova análise
        loadingDiv.classList.add('hidden');
        form.classList.remove('hidden');
        form.reset(); // Limpa o formulário
    }
});