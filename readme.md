# 🤖 Secure AI Sales Bot Generator

A free AI-powered sales bot generator with real-time testing and WhatsApp notifications. Built with security in mind - API keys are safely stored on the server.

## ✨ Features

- **🔐 Secure**: API keys protected on backend server
- **🤖 Real AI**: Powered by Claude 3.5 Sonnet
- **📱 WhatsApp Notifications**: Get notified when users submit bots
- **🆓 Free Testing**: 50 AI conversations per user
- **🔄 Session Management**: Reset and track usage
- **📊 Analytics**: Monitor user engagement

## 🚀 Live Demo

Deploy to Render: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🛠️ Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/secure-sales-bot-generator.git
cd secure-sales-bot-generator
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your actual API keys
```

### 4. Get API Keys

**Claude API Key:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create account and add credits
3. Generate API key
4. Add to `.env` as `CLAUDE_API_KEY`

**Wassenger WhatsApp API:**
1. Sign up at [Wassenger.com](https://wassenger.com)
2. Connect your WhatsApp number
3. Get API token from dashboard
4. Add to `.env` as `WASSENGER_TOKEN`

### 5. Run Locally
```bash
npm start
# Visit http://localhost:3000
```

## 🌐 Deploy to Render

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Deploy on Render
1. Go to [Render.com](https://render.com)
2. Sign up/login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `sales-bot-generator`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add Environment Variables:
   - `CLAUDE_API_KEY`: Your Claude API key
   - `WASSENGER_TOKEN`: Your Wassenger token
   - `WHATSAPP_PHONE`: `60127998080`
   - `NODE_ENV`: `production`
7. Click "Create Web Service"

### Step 3: Access Your App
- Your app will be available at: `https://your-app-name.onrender.com`
- Render provides free SSL certificate
- Auto-deploys on git push

## 🔧 Configuration

### Environment Variables
```env
CLAUDE_API_KEY=sk-ant-your-key-here
WASSENGER_TOKEN=your-token-here
WHATSAPP_PHONE=60127998080
NODE_ENV=production
```

### Rate Limiting
- 50 API calls per user email
- Session reset functionality
- Server-side enforcement

## 📱 WhatsApp Integration

The app sends notifications to your WhatsApp number when:
- User reaches 50 API call limit
- User manually submits bot configuration

Message includes:
- User details (name, email)
- Bot configuration
- Usage statistics
- Generated prompt

## 🔒 Security Features

- ✅ API keys stored on server only
- ✅ No sensitive data in frontend
- ✅ Rate limiting per user
- ✅ Input validation
- ✅ Error handling
- ✅ CORS protection

## 📊 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/claude` | POST | Secure Claude API proxy |
| `/api/notify` | POST | Send WhatsApp notifications |
| `/api/session/:email` | GET | Get user session info |
| `/api/session/reset` | POST | Reset user session |
| `/health` | GET | Health check |

## 🎨 Frontend Features

- Responsive design
- Real-time chat interface
- Session counter
- Form validation
- Notification system
- Auto-save conversations

## 🐛 Troubleshooting

### Common Issues

**1. "Claude API key not configured"**
- Check `.env` file exists
- Verify `CLAUDE_API_KEY` is set
- Restart server after changes

**2. "WhatsApp service not configured"**
- Check `WASSENGER_TOKEN` in environment
- Verify Wassenger account is active
- Test API token in Wassenger dashboard

**3. "Session limit reached"**
- Use session reset functionality
- Check user email uniqueness
- Monitor server logs

### Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Logs
Check Render dashboard for application logs and errors.

## 📈 Monitoring

- Server health: `/health`
- Session tracking in memory
- Error logging to console
- WhatsApp delivery confirmations

## 💰 Cost Estimation

**Per 50 conversations:**
- Claude API: ~$2-5
- Render hosting: Free tier available
- Wassenger: Free for small volumes

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Open Pull Request

## 📄 License

MIT License - feel free to use for commercial projects.

## 🆘 Support

Need help? 
- Check the troubleshooting section
- Review server logs in Render dashboard
- Test API keys in their respective consoles
