const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
const userSessions = new Map();
const generatedBots = new Map();
const botSubmissions = [];

// Claude API configuration (you'll need to set this in Render environment variables)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Generate sophisticated AI bot using Claude API
async function generateAIBot(formData) {
    const systemPrompt = `You are an expert sales bot developer. Create a sophisticated sales bot prompt based on the provided business information. The bot should be professional, intelligent, and follow proven sales methodologies.

Create a comprehensive bot prompt that includes:
1. Professional identity and personality
2. Conversation flow and stages
3. Objection handling strategies
4. Field collection methodology
5. JSON output format for lead capture

Make it as sophisticated as the "Lily" bot example - professional, goal-oriented, and conversion-focused.

Business Details:
- Business: ${formData.businessName}
- Type: ${formData.businessType}
- Bot Name: ${formData.botName}
- Goal: ${formData.primaryGoal}
- Communication Style: ${formData.communicationTone}
- Language: ${formData.languageSupport}
- Services: ${formData.services}
- Discovery Questions: ${formData.discoveryQuestions}
- Working Hours: ${formData.workingHours}
- Qualification Criteria: ${formData.qualificationCriteria || 'Standard qualification'}
- Custom Fields: ${formData.customFields || 'None'}

Create a complete, professional sales bot prompt that will drive ${formData.primaryGoal}.`;

    try {
        if (!CLAUDE_API_KEY) {
            console.log('⚠️ Claude API key not configured, using fallback generation');
            return generateFallbackBot(formData);
        }

        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2025-05-14'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 8192,
                messages: [{
                    role: 'user',
                    content: systemPrompt
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedPrompt = data.content[0].text;

        console.log('✅ Claude API generated sophisticated bot');
        return {
            type: 'claude_generated',
            prompt: generatedPrompt,
            config: formData
        };

    } catch (error) {
        console.error('❌ Claude API error:', error.message);
        console.log('🔄 Falling back to template generation');
        return generateFallbackBot(formData);
    }
}

// Fallback bot generation if Claude API is not available
function generateFallbackBot(formData) {
    const prompt = `## Core Identity
You are ${formData.botName}, a professional sales consultant for ${formData.businessName}, specializing in ${formData.businessType}. You use consultative selling to understand customer needs and guide them to appropriate solutions.

## Communication Style
* **Tone**: ${formData.communicationTone}
* **Language**: ${formData.languageSupport}
* **Format**: Short, conversational messages (max 3 per response)
* **Natural flow**: Acknowledge → Understand → Guide → Close

## Primary Objective
${formData.primaryGoal}

## Conversation Flow

### Step 1: Natural Opening
- Acknowledge their interest naturally
- Ask what's prompting them to reach out
- Always introduce yourself

### Step 2: Discovery & Problem Identification
- Use consultative questions to understand their specific problem
- Key questions: ${formData.discoveryQuestions}

### Step 3: Service Matching
- Present relevant service options based on their problem
- Services available: ${formData.services}

### Step 4: Information Collection
- Collect required customer information systematically
- Working hours: ${formData.workingHours}

### Step 5: Confirmation & Handoff
- Format confirmation with contact details
- Explain next steps

Remember: Your goal is to provide excellent customer service while driving ${formData.primaryGoal} for ${formData.businessName}.`;

    return {
        type: 'template_generated',
        prompt: prompt,
        config: formData
    };
}

// Generate responses using the created bot
async function generateBotResponse(message, botData, history) {
    try {
        if (botData.type === 'claude_generated' && CLAUDE_API_KEY) {
            // Use Claude API with the generated bot prompt
            const conversationPrompt = `${botData.prompt}

Previous conversation:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

Customer: ${message}

Respond as the sales bot following your instructions:`;

            const response = await fetch(CLAUDE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 1000,
                    messages: [{
                        role: 'user',
                        content: conversationPrompt
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.content[0].text;
            }
        }

        // Fallback to basic response generation
        return generateBasicResponse(message, botData.config, history);

    } catch (error) {
        console.error('Bot response error:', error);
        return generateBasicResponse(message, botData.config, history);
    }
}

// Basic response generation (fallback)
function generateBasicResponse(message, config, history) {
    const msg = message.toLowerCase();
    const businessName = config.businessName;
    const botName = config.botName.split(' - ')[0] || config.botName;
    const businessType = config.businessType;
    
    if (history.length === 0) {
        return `Hello! I'm ${botName} from ${businessName}. I'm here to help you with our ${businessType}. What's brought you to reach out to us today?`;
    }
    
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
        return `Hello! It's great to hear from you! I'm ${botName}, and I'm here to help you with everything related to our ${businessType} at ${businessName}. How can I assist you today?`;
    }
    
    if (msg.includes('service') || msg.includes('what do you') || msg.includes('offer')) {
        return `At ${businessName}, we specialize in ${businessType}. I'd be happy to discuss our services with you in detail. What specific area are you most interested in?`;
    }
    
    return `That's really interesting! At ${businessName}, we help people with situations exactly like this through our ${businessType} approach. What outcome would be most valuable for you?`;
}

// API Routes

// Generate AI bot from form data
app.post('/api/generate-bot', async (req, res) => {
    try {
        const formData = req.body;
        console.log('🚀 Generating AI bot for:', formData.businessName);
        
        // Validate required fields
        const required = ['businessName', 'businessType', 'botName', 'primaryGoal', 'services'];
        for (const field of required) {
            if (!formData[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }
        
        // Generate sophisticated bot using Claude API
        const botData = await generateAIBot(formData);
        
        // Store the generated bot
        const botId = Date.now().toString();
        generatedBots.set(botId, botData);
        
        console.log(`✅ Generated ${botData.type} bot with ID: ${botId}`);
        
        res.json({
            success: true,
            botId: botId,
            botType: botData.type,
            prompt: botData.prompt,
            message: `Sophisticated AI bot generated successfully using ${botData.type === 'claude_generated' ? 'Claude API' : 'template'}`
        });
        
    } catch (error) {
        console.error('Bot generation error:', error);
        res.status(500).json({ error: 'Failed to generate bot' });
    }
});

// Chat with generated bot
app.post('/api/chat', (req, res) => {
    try {
        const { message, botId, history } = req.body;
        
        if (!message || !botId) {
            return res.status(400).json({ error: 'Message and botId are required' });
        }
        
        const botData = generatedBots.get(botId);
        if (!botData) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        console.log(`💬 Chat request for bot ${botId}:`, message);
        
        // Generate response using the sophisticated bot
        generateBotResponse(message, botData, history || [])
            .then(response => {
                console.log('📤 Bot response generated');
                res.json({ response });
            })
            .catch(error => {
                console.error('Chat error:', error);
                res.status(500).json({ error: 'Failed to generate response' });
            });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat' });
    }
});

// Get user session
app.get('/api/session/:email', (req, res) => {
    const { email } = req.params;
    const session = userSessions.get(email) || { sessionCount: 0 };
    res.json(session);
});

// Update user session
app.post('/api/session', (req, res) => {
    const { email, sessionCount } = req.body;
    userSessions.set(email, { sessionCount });
    res.json({ success: true });
});

// Submit bot for WhatsApp integration (purchase flow)
app.post('/api/submit-bot', (req, res) => {
    try {
        const botData = req.body;
        botData.id = Date.now();
        botData.submittedAt = new Date().toISOString();
        botData.status = 'pending_payment';
        
        botSubmissions.push(botData);
        console.log('💰 Bot submitted for purchase:', { 
            id: botData.id, 
            businessName: botData.businessName 
        });
        
        res.json({ 
            success: true, 
            message: 'Bot submitted for WhatsApp integration! Payment and setup instructions will be sent.',
            botId: botData.id 
        });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Failed to submit bot' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        claudeApi: CLAUDE_API_KEY ? 'configured' : 'not_configured',
        activeUsers: userSessions.size,
        generatedBots: generatedBots.size,
        botSubmissions: botSubmissions.length
    });
});

// Get bot info
app.get('/api/bot/:botId', (req, res) => {
    const { botId } = req.params;
    const botData = generatedBots.get(botId);
    
    if (!botData) {
        return res.status(404).json({ error: 'Bot not found' });
    }
    
    res.json({
        botId: botId,
        type: botData.type,
        businessName: botData.config.businessName,
        botName: botData.config.botName,
        generatedAt: new Date().toISOString()
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Sales Bot Generator running on port ${PORT}`);
    console.log(`🧠 Claude API: ${CLAUDE_API_KEY ? '✅ Configured' : '❌ Not configured (using fallback)'}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log('\n📋 Available API Endpoints:');
    console.log('POST /api/generate-bot - Generate sophisticated AI bot');
    console.log('POST /api/chat - Chat with generated bot');
    console.log('GET  /api/health - Health check');
    console.log('POST /api/submit-bot - Submit for WhatsApp integration');
    console.log('GET  / - Main application\n');
});

module.exports = app;
