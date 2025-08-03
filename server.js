// server.js - Optimized for Render deployment
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || '60127998080';
const PORT = process.env.PORT || 3000;

// In-memory storage (for demo - use database in production)
const userSessions = new Map();
const MAX_SESSIONS_PER_USER = 50;

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Claude API endpoint with better error handling
app.post('/api/claude', async (req, res) => {
    try {
        // Validate API key
        if (!CLAUDE_API_KEY) {
            return res.status(500).json({ 
                error: 'Claude API key not configured on server' 
            });
        }

        const { messages, userEmail } = req.body;
        
        if (!messages || !userEmail) {
            return res.status(400).json({ 
                error: 'Missing required fields: messages and userEmail' 
            });
        }

        // Check user session limit
        const userSessionCount = userSessions.get(userEmail) || 0;
        if (userSessionCount >= MAX_SESSIONS_PER_USER) {
            return res.status(429).json({ 
                error: 'Session limit reached. Please reset your session.',
                remaining: 0,
                sessionCount: userSessionCount
            });
        }

        // Import fetch dynamically (for Node.js compatibility)
        const fetch = (await import('node-fetch')).default;

        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1000,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Claude API Error:', errorData);
            return res.status(response.status).json({ 
                error: errorData.error?.message || 'Claude API Error' 
            });
        }

        const data = await response.json();
        
        // Update user session count
        const newSessionCount = userSessionCount + 1;
        userSessions.set(userEmail, newSessionCount);
        
        console.log(`API call for ${userEmail}: ${newSessionCount}/${MAX_SESSIONS_PER_USER}`);
        
        res.json({
            message: data.content[0]?.text || "Sorry, I couldn't generate a response.",
            remaining: MAX_SESSIONS_PER_USER - newSessionCount,
            sessionCount: newSessionCount
        });

    } catch (error) {
        console.error('Claude API Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// WhatsApp notification endpoint
app.post('/api/notify', async (req, res) => {
    try {
        if (!WASSENGER_TOKEN) {
            return res.status(500).json({ 
                error: 'WhatsApp service not configured' 
            });
        }

        const { 
            type, 
            userEmail, 
            userName, 
            botConfig, 
            sessionCount, 
            conversationLength, 
            prompt 
        } = req.body;

        const message = type === 'limit_reached' 
            ? `🤖 FREE AI BOT GENERATOR - LIMIT REACHED

👤 User: ${userName}
📧 Email: ${userEmail}

🏢 Business: ${botConfig.businessName}
🎯 Service: ${botConfig.businessType}
🤖 Bot Name: ${botConfig.botName}

📊 Usage: 50/50 API calls completed
💬 Total conversations: ${conversationLength}

📝 Generated Prompt Preview:
${prompt.substring(0, 500)}...

⏰ ${new Date().toLocaleString()}`
            : `🤖 FREE AI BOT GENERATOR - SUBMISSION

👤 User: ${userName}
📧 Email: ${userEmail}

🏢 Business: ${botConfig.businessName}
🎯 Service: ${botConfig.businessType}
🤖 Bot Name: ${botConfig.botName}

📊 Usage: ${sessionCount}/50 API calls
💬 Conversations: ${conversationLength}

📝 Generated Prompt Preview:
${prompt.substring(0, 500)}...

⏰ ${new Date().toLocaleString()}`;

        // Import fetch dynamically
        const fetch = (await import('node-fetch')).default;

        // Send WhatsApp via Wassenger
        const whatsappResponse = await fetch('https://api.wassenger.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Token': WASSENGER_TOKEN
            },
            body: JSON.stringify({
                phone: WHATSAPP_PHONE,
                message: message
            })
        });

        if (!whatsappResponse.ok) {
            const errorData = await whatsappResponse.text();
            console.error('WhatsApp API Error:', errorData);
            throw new Error('WhatsApp API failed');
        }

        console.log(`WhatsApp notification sent to ${WHATSAPP_PHONE} for user ${userEmail}`);
        
        res.json({ 
            success: true, 
            message: 'Notification sent successfully' 
        });

    } catch (error) {
        console.error('WhatsApp notification error:', error);
        res.status(500).json({ 
            error: 'Failed to send notification',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get user session info
app.get('/api/session/:email', (req, res) => {
    const email = req.params.email;
    const sessionCount = userSessions.get(email) || 0;
    
    res.json({
        sessionCount,
        remaining: MAX_SESSIONS_PER_USER - sessionCount,
        maxSessions: MAX_SESSIONS_PER_USER
    });
});

// Reset user session
app.post('/api/session/reset', (req, res) => {
    const { userEmail } = req.body;
    
    if (!userEmail) {
        return res.status(400).json({ error: 'userEmail is required' });
    }
    
    userSessions.set(userEmail, 0);
    console.log(`Session reset for user: ${userEmail}`);
    
    res.json({ 
        success: true, 
        message: 'Session reset successfully',
        remaining: MAX_SESSIONS_PER_USER 
    });
});

// Admin endpoint to view all sessions (for debugging)
app.get('/api/admin/sessions', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const sessions = Array.from(userSessions.entries()).map(([email, count]) => ({
        email,
        sessionCount: count,
        remaining: MAX_SESSIONS_PER_USER - count
    }));
    
    res.json(sessions);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 Claude API: ${CLAUDE_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`📱 WhatsApp: ${WASSENGER_TOKEN ? 'Configured ✅' : 'Missing ❌'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
