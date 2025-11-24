# Browser Automation MCP Setup

This directory contains configuration and automation scripts for using browser automation MCP servers to test the BATL application.

## What are these MCP servers?

We're using **two complementary MCP servers** for browser automation:

### 1. Playwright MCP (Recommended for Testing)
- **Best for**: E2E test automation
- **Strengths**: 
  - Fast and lightweight (uses accessibility tree, not pixels)
  - Built specifically for testing with assertions
  - Cross-browser support (Chrome, Firefox, Safari, Edge)
  - More robust selectors and wait strategies
  - Better for structured test scenarios
- **From**: Microsoft (https://github.com/microsoft/playwright-mcp)

### 2. Chrome DevTools MCP (Good for Debugging)
- **Best for**: Performance analysis and debugging
- **Strengths**:
  - Performance traces and insights
  - Network request inspection
  - Console log access
  - Chrome-specific DevTools features
- **From**: Google Chrome team (https://github.com/ChromeDevTools/chrome-devtools-mcp)

**Recommendation**: Use **Playwright MCP** for running the automated tests in this project. It's more reliable and better suited for E2E testing scenarios.

## Setup Instructions

### For Claude Desktop

1. Open your Claude Desktop configuration file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add both MCP server configurations:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

3. Restart Claude Desktop

### For Cline (VS Code Extension)

1. Open VS Code Settings (JSON)
2. Add to your settings:

```json
{
  "cline.mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

3. Reload VS Code window

### For Other MCP Clients

Refer to your MCP client's documentation for adding custom MCP servers. Use the configuration from `mcp-config.json` as a reference.

## Which MCP Server Should I Use?

### Use **Playwright MCP** for:
- ✅ Running the automated test scenarios from MANUAL_TESTING.md
- ✅ E2E testing and test automation
- ✅ Form filling and user interactions
- ✅ Cross-browser testing
- ✅ Reliable element selection and waiting
- ✅ Test assertions and validations

### Use **Chrome DevTools MCP** for:
- 🔍 Performance profiling and optimization
- 🔍 Network request analysis
- 🔍 Debugging console errors
- 🔍 Taking screenshots for documentation
- 🔍 Chrome-specific features

**For this project's testing needs, Playwright MCP is the better choice.**

## Prerequisites for Testing

Before running the automated tests, ensure:

1. **Backend server is running**
   ```bash
   cd backend
   npm run dev
   ```
   Default URL: `http://localhost:3000`

2. **Frontend server is running**
   ```bash
   cd frontend
   npm run dev
   ```
   Default URL: `http://localhost:5173`

3. **Test database has sample data**
   - At least one organizer/admin user account
   - Sample players for singles tournaments
   - Sample pairs for doubles tournaments
   - At least one singles tournament
   - At least one doubles tournament

4. **Organizer credentials ready**
   - You'll need login credentials for an organizer or admin account

## Running Automated Tests

Once Chrome DevTools MCP is configured, you can ask your AI assistant to:

1. **Run all tests**:
   ```
   Run the automated tests in .mcp/test-automation.js
   ```

2. **Run specific test scenarios**:
   ```
   Test scenario 1 (Singles Registration) from MANUAL_TESTING.md
   ```

3. **Test with custom parameters**:
   ```
   Test doubles registration for tournament ID 123
   ```

## Test Scenarios

The automation script covers all 7 scenarios from [MANUAL_TESTING.md](../MANUAL_TESTING.md):

1. ✅ Singles Tournament Registration
2. ✅ Doubles Tournament Registration
3. ✅ Waitlist Management (Tournament Full)
4. ✅ Waitlist Swap (Demotion)
5. ✅ Rankings Display (Singles)
6. ✅ Rankings Display (Doubles)
7. ✅ Withdrawal and Auto-Promotion

## Troubleshooting

### MCP Server Not Found

If you get an error that an MCP server is not available:
1. Verify the configuration is correct in your MCP client
2. Restart your MCP client
3. Check that Node.js v18+ is installed: `node --version`
4. Manually test the servers:
   - Playwright: `npx @playwright/mcp@latest`
   - Chrome DevTools: `npx -y chrome-devtools-mcp@latest`

### Which Server is Running?

To check which MCP servers are active, look for them in your MCP client's server list or logs.

### Tests Failing

If automated tests fail:
1. Check that both backend and frontend servers are running
2. Verify the database has sample data
3. Check browser console for errors
4. Review the test output and screenshots for details

### Chrome Not Opening

If Chrome doesn't open during testing:
1. Ensure Chrome is installed and up to date
2. Check that Chrome is in your system PATH
3. Try closing all Chrome instances and running again

## Manual Testing

If automated testing is not available, refer to [MANUAL_TESTING.md](../MANUAL_TESTING.md) for step-by-step manual testing procedures.

## Resources

- [Chrome DevTools MCP Documentation](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [BATL Manual Testing Guide](../MANUAL_TESTING.md)
