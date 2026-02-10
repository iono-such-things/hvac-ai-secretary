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
        
        hideTypingIndicator();
        
        if (data.response) {
            addMessage(data.response, false);
        } else if (data.error) {
            addMessage('Sorry, I encountered an error. Please try again or call us at (555) HVAC-NOW for immediate assistance.', false);
            console.error('API Error:', data.error);
        }
    } catch (error) {
        hideTypingIndicator();
        addMessage('Sorry, I couldn\'t connect to the server. Please try again or call us at (555) HVAC-NOW for immediate assistance.', false);
        console.error('Fetch error:', error);
    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Send Quick Message
function sendQuickMessage(text) {
    userInput.value = text;
    sendMessage();
}

// Handle Enter Key
function handleKeyPress(event) {
    if (event.key === 'Enter' && !sendButton.disabled) {
        sendMessage();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scroll for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Add animation on scroll for service cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe service cards and pricing cards
    document.querySelectorAll('.service-card, .pricing-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Close chat when clicking outside
    document.addEventListener('click', function(event) {
        if (chatOpen && 
            !chatWindow.contains(event.target) && 
            !chatBubble.contains(event.target)) {
            toggleChat();
        }
    });

    // Prevent chat window clicks from closing it
    chatWindow.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > lastScroll && currentScroll > 100) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
});