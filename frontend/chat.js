const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

const userId = 'anonimo'; // pode gerar UUID se quiser

function addMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender === 'user' ? 'user' : 'trexinho');
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  addMessage('user', message);
  userInput.value = '';

  addMessage('trexinho', 'Digitando...');

  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message })
  });

  const data = await resp.json();

  // remove o "Digitando..."
  chatBox.lastChild.remove();
  addMessage('trexinho', data.reply || "Não consegui responder.");
});
