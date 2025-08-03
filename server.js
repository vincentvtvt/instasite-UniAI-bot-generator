const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
const userSessions = new Map();
const botSubmissions = [];

// Mock AI response function (replace with real AI API)
function generateAIResponse(message, config, history) {
    const msg = message.toLowerCase();
    const businessName = config.businessName;
    const botName = config.botName.split(' - ')[0] || config.botName;
    const businessType = config.businessType;
    const services = config.services ? config.services.split('\n').filter(s => s.trim()) : [];
    
    // First interaction
    if (history.length === 0) {
        return `Hello! I'm ${botName} from ${businessName}. I'm here to help you with our ${businessType}. What's brought you to reach out to us today?`;
    }
    
    // Greeting responses
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg === 'hi') {
        return `Hello! It's great to hear from you! I'm ${botName}, and I'm here to help you with everything related to our ${businessType} at ${businessName}. How can I assist you today?`;
    }
    
    // Service inquiries
    if (msg.includes('service') || msg.includes('what do you') || msg.includes('offer') || msg.includes('do you have') || msg.includes('what can') || msg.includes('what')) {
        if (services.length > 0) {
            let response = `At ${businessName}, we specialize in ${businessType}. Here's what we offer:\n\n`;
            services.slice(0, 5).forEach(service => {
                const cleanService = service.replace(/^\*\*.*?\*\*/, '').trim();
                if (cleanService) {
                    response += `• ${cleanService}\n`;
                }
            });
            if (services.length > 5) response += '• And more...\n';
            response += `\nBased on what you've shared, which of these interests you most?`;
            return response;
        } else {
            return `At ${businessName}, we specialize in ${businessType}. I'd be happy to discuss our services with you in detail. What specific area are you most interested in?`;
        }
    }
    
    // Pricing inquiries
    if (msg.includes('price') || msg.includes('cost') || msg.includes('how much') || msg.includes('pricing') || msg.includes('fee')) {
        if (services.length > 0) {
            let response = `Here are our current rates:\n\n`;
            const pricedServices = services.filter(s => s.includes('RM') || s.includes('$') || s.includes('USD'));
            if (pricedServices.length > 0) {
                pricedServices.slice(0, 6).forEach(service => {
                    const cleanService = service.replace(/^\*\*.*?\*\*/, '').trim();
                    if (cleanService) {
                        response += `• ${cleanService}\n`;
                    }
                });
            } else {
                response += `I'd be happy to discuss pricing for our ${businessType} services.\n`;
            }
            response += `\nTo help me recommend the best option for you, what specific area would you like to focus on?`;
            return response;
        } else {
            return `I'd be happy to discuss our pricing for ${businessType}. To give you the most accurate quote, could you tell me what specific service you're interested in?`;
        }
    }
    
    // Booking inquiries
    if (msg.includes('book') || msg.includes('appointment') || msg.includes('schedule') || msg.includes('available') || msg.includes('when')) {
        return `I'd be happy to help you schedule an appointment! Our working hours are ${config.workingHours || 'Monday-Sunday, 10am-8pm'}.\n\nTo get you set up, I'll need to know:\n• Which service interests you most\n• What specific goals you have\n• Your preferred timing\n\nLet's start - which service caught your attention?`;
    }
    
    // Positive responses
    if (msg.includes('yes') || msg.includes('sure') || msg.includes('okay') || msg.includes('ok') || msg.includes('interested')) {
        const lastBotMessage = history.length > 0 ? history[history.length - 1].content : '';
        
        if (lastBotMessage.includes('pricing') || lastBotMessage.includes('rates')) {
            return `Perfect! Let me share more details about our pricing and help you choose the right service. What specific area are you most interested in addressing?`;
        }
        
        if (lastBotMessage.includes('service') || lastBotMessage.includes('offer')) {
            return `Wonderful! I'd love to match you with the perfect service. Could you tell me more about what specific challenges or goals you're working on?`;
        }
        
        return `Great! I'm excited to help you. To ensure I recommend the best approach for your situation, could you share a bit more about what you're hoping to achieve?`;
    }
    
    // Problem descriptions
    if (msg.includes('problem') || msg.includes('issue') || msg.includes('challenge') || msg.includes('help') || msg.includes('need') || msg.includes('difficult')) {
        return `I understand, and you're in the right place. Many of our clients have faced similar challenges. Based on what you've shared, I believe our ${businessType} services could really help.\n\nWould you like me to explain which specific approach might work best for your situation?`;
    }
    
    // Contact inquiries
    if (msg.includes('where') || msg.includes('location') || msg.includes('address') || msg.includes('contact') || msg.includes('phone')) {
        return `For specific location and contact details, I'd be happy to provide those once we determine the best service for you.\n\nRight now, I'd love to focus on understanding your needs better. What's the main thing you're hoping to resolve or achieve?`;
    }
    
    // Thank you responses
    if (msg.includes('thank') || msg.includes('thanks')) {
        return `You're very welcome! I'm here to help you every step of the way. What else would you like to know about how we can assist you?`;
    }
    
    // Discovery questions
    if (config.discoveryQuestions && config.discoveryQuestions.trim()) {
        const discoveryQuestions = config.discoveryQuestions.split('\n').filter(q => q.trim());
        if (discoveryQuestions.length > 0) {
            const randomQuestion = discoveryQuestions[Math.floor(Math.random() * discoveryQuestions.length)];
            const cleanQuestion = randomQuestion.replace(/^-\s*/, '').trim();
            return `That's really interesting! ${cleanQuestion}`;
        }
    }
    
    // Default responses
    const defaultResponses = [
        `That's really interesting. At ${businessName}, we help people with situations exactly like this through our ${businessType} approach. What outcome would be most valuable for you?`,
        `I can definitely help with that! Many of our clients start with similar concerns. What would success look like for you in this area?`,
        `Thank you for sharing that. Our ${businessType} services are designed to address exactly these kinds of situations. What's the most important change you'd want to see?`,
        `I understand, and I believe we can help. At ${businessName}, we've supported many people through similar challenges. What's driving your interest in finding a solution now?`
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// API Routes

// Get user session
app.get('/api/session/:email', (req, res) => {
    const { email } = req.params;
    const session = userSessions.get(email) || { sessionCount: 0 };
    console.log(`Getting session for ${email}:`, session);
    res.json(session);
});

// Update user session
app.post('/api/session', (req, res) => {
    const { email, sessionCount } = req.body;
    userSessions.set(email, { sessionCount });
    console.log(`Updated session for ${email}:`, { sessionCount });
    res.json({ success: true });
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
    try {
        const { message, config, history } = req.body;
        console.log('Chat request:', { message, businessName: config?.businessName });
        
        if (!message || !config) {
            return res.status(400).json({ error: 'Message and config are required' });
        }
        
        const response = generateAIResponse(message, config, history || []);
        console.log('Generated response:', response.substring(0, 100) + '...');
        
        res.json({ response });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

// Submit bot configuration
app.post('/api/submit-bot', (req, res) => {
    try {
        const botData = req.body;
        botData.id = Date.now();
        botData.submittedAt = new Date().toISOString();
        
        botSubmissions.push(botData);
        console.log('Bot submitted:', { 
            id: botData.id, 
            businessName: botData.businessName,
            botName: botData.botName 
        });
        
        // Here you would typically:
        // 1. Save to database
        // 2. Send WhatsApp notification
        // 3. Process the bot configuration
        
        res.json({ 
            success: true, 
            message: 'Bot submitted successfully!',
            botId: botData.id 
        });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Failed to submit bot' });
    }
});

// Get all bot submissions (admin endpoint)
app.get('/api/bots', (req, res) => {
    res.json(botSubmissions);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        activeUsers: userSessions.size,
        botSubmissions: botSubmissions.length
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Sales Bot Generator API running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    
    // Log available endpoints
    console.log('\n📋 Available API Endpoints:');
    console.log('GET  /api/health - Health check');
    console.log('GET  /api/session/:email - Get user session');
    console.log('POST /api/session - Update user session');
    console.log('POST /api/chat - AI chat endpoint');
    console.log('POST /api/submit-bot - Submit bot configuration');
    console.log('GET  /api/bots - Get all bot submissions');
    console.log('GET  / - Serve main application\n');
});

module.exports = app;
