// Chat Window State
let chatOpen = false;

// DOM Elements
const chatBubble = document.getElementById('chatBubble');
const chatWindow = document.getElementById('chatWindow');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Toggle Chat Window
function toggleChat() {
    chatOpen = !chatOpen;
    if (chatOpen) {
        chatWindow.classList.add('active');
        userInput.focus();
    } else {
        chatWindow.classList.remove('active');
    }
}

// Scroll to Section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Open Chat with Pre-filled Message
function openChat(message) {
    if (!chatOpen) {
        toggleChat();
    }
    if (message) {
        userInput.value = message;
        userInput.focus();
    }
}

// Add Message to Chat
function addMessage(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(contentDiv);
    
    // Insert before quick actions if they exist
    const quickActions = document.getElementById('quickActions');
    if (quickActions && !isUser) {
        chatMessages.insertBefore(messageDiv, quickActions);
    } else {
        chatMessages.appendChild(messageDiv);
    }
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show Typing Indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(indicator);
    
    const quickActions = document.getElementById('quickActions');
    if (quickActions) {
        chatMessages.insertBefore(typingDiv, quickActions);
    } else {
        chatMessages.appendChild(typingDiv);
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide Typing Indicator
function hideTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// Send Message
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, true);
    userInput.value = '';
    sendButton.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();

        if (data.success) {
            addMessage(data.response, false);
        } else {
            addMessage('Sorry, I encountered an error. Please try again.', false);
        }
    } catch (error) {
        hideTypingIndicator();
        addMessage('Sorry, I\'m having trouble connecting. Please try again later.', false);
    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Event Listeners
chatBubble.addEventListener('click', toggleChat);
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Booking Modal Management
let bookingModalRoot = null;

function openBookingModal() {
    // Get or create the modal root
    bookingModalRoot = document.getElementById('booking-modal-root');
    
    if (!bookingModalRoot) {
        console.error('Booking modal root element not found');
        return;
    }

    // Render the BookingModal component with React
    const root = ReactDOM.createRoot(bookingModalRoot);
    root.render(
        React.createElement(BookingModal, {
            isOpen: true,
            onClose: closeBookingModal
        })
    );
}

function closeBookingModal() {
    if (bookingModalRoot) {
        const root = ReactDOM.createRoot(bookingModalRoot);
        root.render(null);
        bookingModalRoot = null;
    }
}

// Connect Schedule Service button to modal
document.addEventListener('DOMContentLoaded', () => {
    // Find the Schedule Service button in the hero section
    const scheduleButtons = document.querySelectorAll('.cta-button');
    
    scheduleButtons.forEach(button => {
        if (button.textContent.includes('Schedule Service')) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                openBookingModal();
            });
        }
    });
});

// Initial greeting when chat opens for the first time
chatBubble.addEventListener('click', function firstOpen() {
    setTimeout(() => {
        if (chatMessages.children.length === 1) { // Only quick actions present
            addMessage('Hi! I\'m your HVAC assistant. How can I help you today?', false);
        }
    }, 300);
    chatBubble.removeEventListener('click', firstOpen);
}, { once: true });