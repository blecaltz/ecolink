const form = document.getElementById('analysis-form');
const loadingDiv = document.getElementById('loading');
const resultContainer = document.getElementById('result-container');
const diagnosisText = document.getElementById('diagnosis-text');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  loadingDiv.classList.remove('hidden');
  resultContainer.classList.add('hidden');
  form.classList.add('hidden');

  try {
    const response = await fetch('/api/analyze', { 
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(()=>null);
      throw new Error(err?.error || response.statusText);
    }

    const data = await response.json();

    diagnosisText.textContent = data.diagnosis || "Nenhum diagnóstico retornado.";
    resultContainer.classList.remove('hidden');

    // opcional: exibir último histórico
    if (data.lastMessages) {
      const hist = data.lastMessages.map(m => {
        const who = m.sender === 'user' ? 'Você' : 'Tréxinho';
        return `${who}: ${m.text}`;
      }).join('\n\n');
      diagnosisText.textContent += '\n\nHistórico:\n' + hist;
    }

  } catch (error) {
    console.error("Erro:", error);
    diagnosisText.textContent = "Desculpe, não consegui completar a análise. Tente novamente.";
    resultContainer.classList.remove('hidden');
  } finally {
    loadingDiv.classList.add('hidden');
    form.classList.remove('hidden');
    form.reset();
  }
});
