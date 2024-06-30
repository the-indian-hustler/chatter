const socket = io();

const registerButton = document.getElementById('register-button');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button'); // Added logout button
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const form = document.getElementById('chat-form');
const input = document.getElementById('input');
const recipientInput = document.getElementById('recipient');
const messages = document.getElementById('messages');
const userNameDisplay = document.getElementById('user-name');

let username;

registerButton.addEventListener('click', async () => {
    const username = usernameInput.value;
    const email = emailInput.value;
    if (username && email) {
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email })
            });
            if (response.ok) {
                alert('Registration successful');
            } else {
                const error = await response.text();
                alert(`Registration failed: ${error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    } else {
        alert('Please provide both username and email');
    }
});

loginButton.addEventListener('click', async () => {
    username = usernameInput.value;
    if (username) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            if (response.ok) {
                socket.emit('register', username);
                userNameDisplay.textContent = username;
                document.getElementById('login-container').style.display = 'none';
                document.getElementById('chat-container').style.display = 'flex';
                await loadMessages();
            } else {
                const error = await response.text();
                alert(`Login failed: ${error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    } else {
        alert('Please provide your username');
    }
});

logoutButton.addEventListener('click', () => {
    // Implement logout functionality
    username = null;
    userNameDisplay.textContent = '';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
    messages.innerHTML = ''; // Clear messages when logging out
});

socket.on('private message', ({ message, sender }) => {
    console.log(`Received private message from ${sender}: ${message}`);
    appendMessage(`${sender}: ${message}`, 'received');
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const recipient = recipientInput.value;
    const message = input.value;
    if (recipient && message) {
        console.log(`Sending message to ${recipient}: ${message}`);
        appendMessage(`Me: ${message}`, 'sent');
        socket.emit('private message', { recipient, message });
        input.value = ''; // Clear input after sending
    }
});

async function loadMessages() {
    try {
        const response = await fetch('/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        if (response.ok) {
            const messages = await response.json();
            messages.forEach(msg => {
                const type = msg.sender === username ? 'sent' : 'received';
                appendMessage(`${msg.sender}: ${msg.message}`, type);
            });
        } else {
            const error = await response.text();
            alert(`Failed to load messages: ${error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function appendMessage(msg, type) {
    const item = document.createElement('div');
    item.textContent = msg;
    item.classList.add('message', type);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Auto-scroll to the bottom
}