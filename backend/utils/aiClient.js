const Anthropic = require('@anthropic-ai/sdk');

// Shared client — initialised once, reused across all AI controllers
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = claude;
