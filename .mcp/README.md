# Browser Automation MCP Setup

This directory contains everything you need to set up and run automated browser tests for the BATL application.

## 📁 Files in this Directory

- **`mcp-config.json`** - Reference configuration for MCP servers (copy to your MCP client config)
- **`MCP_SETUP.md`** - Complete setup instructions for different MCP clients
- **`MCP_COMPARISON.md`** - Comparison between Playwright and Chrome DevTools MCP
- **`test-automation.js`** - Test automation script for all 7 manual test scenarios

## 🚀 Quick Start

### 1. Choose Your MCP Server

We recommend **Playwright MCP** for testing (see [MCP_COMPARISON.md](MCP_COMPARISON.md) for why).

### 2. Install the MCP Server

Add to your MCP client configuration (Claude Desktop, Cline, etc.):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

See [MCP_SETUP.md](MCP_SETUP.md) for detailed instructions for your specific MCP client.

### 3. Start Your Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 4. Run the Tests

Ask your AI assistant:
```
Run the automated tests from .mcp/test-automation.js using Playwright MCP
```

Or run specific scenarios:
```
Test scenario 1 (Singles Registration) from MANUAL_TESTING.md
```

## 📋 What Gets Tested

The automation covers all 7 scenarios from [MANUAL_TESTING.md](../MANUAL_TESTING.md):

1. ✅ Singles Tournament Registration
2. ✅ Doubles Tournament Registration  
3. ✅ Waitlist Management (Tournament Full)
4. ✅ Waitlist Swap (Demotion)
5. ✅ Rankings Display (Singles)
6. ✅ Rankings Display (Doubles)
7. ✅ Withdrawal and Auto-Promotion

## 🔧 Configuration

Before running tests, update the credentials in `test-automation.js`:

```javascript
const CONFIG = {
  frontendUrl: 'http://localhost:5173',
  backendUrl: 'http://localhost:3000',
  credentials: {
    email: 'organizer@example.com',  // UPDATE THIS
    password: 'password123'           // UPDATE THIS
  }
};
```

## 📚 Documentation

- **Setup Guide**: [MCP_SETUP.md](MCP_SETUP.md)
- **MCP Comparison**: [MCP_COMPARISON.md](MCP_COMPARISON.md)
- **Manual Testing Guide**: [../MANUAL_TESTING.md](../MANUAL_TESTING.md)

## 🆘 Troubleshooting

See the Troubleshooting section in [MCP_SETUP.md](MCP_SETUP.md#troubleshooting).

Common issues:
- MCP server not found → Check configuration and restart MCP client
- Tests failing → Ensure both servers are running and database has data
- Browser not opening → Check Chrome/browser installation

## 🎯 Recommended Workflow

1. **Install both MCP servers** (Playwright + Chrome DevTools)
2. **Use Playwright MCP** for running automated tests
3. **Use Chrome DevTools MCP** for debugging and performance analysis
4. **Run tests after code changes** to catch regressions
5. **Review test results** and screenshots for any failures

## 📖 Resources

- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
