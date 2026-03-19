const { createHash } = require('crypto');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const PasswordCheck = require('../models/PasswordCheck');
const ai = require('../utils/aiClient');
const { buildSixEyesSystemPrompt } = require('../utils/promptBuilder');

const CHAT_MODEL = process.env.AI_CHAT_MODEL || 'claude-haiku-4-5-20251001';
const MAX_HISTORY = 6; // max prior messages sent for context (3 exchanges)

const giveConsent = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { 'aiConsent.accepted': true, 'aiConsent.acceptedAt': new Date() },
    });
    res.json({ accepted: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const withdrawConsent = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { 'aiConsent.accepted': false, 'aiConsent.acceptedAt': null },
    });
    res.json({ accepted: false });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const chat = async (req, res) => {
  // Consent gate
  if (!req.user.aiConsent?.accepted) {
    return res.status(403).json({ message: 'AI consent required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI features not configured on this server' });
  }

  const { message, history: clientHistory } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ message: 'Message is required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ message: 'Message too long (max 2000 characters)' });
  }

  // Build user context from DB — no PII
  const [strengthCount, breachCount, generatedCount] = await Promise.all([
    PasswordCheck.countDocuments({ userId: req.user._id, type: 'strength' }),
    PasswordCheck.countDocuments({ userId: req.user._id, type: 'breach' }),
    PasswordCheck.countDocuments({ userId: req.user._id, type: 'generated' }),
  ]);

  const systemPrompt = buildSixEyesSystemPrompt({
    voidwatchEnabled: req.user.monitoring?.enabled || false,
    strengthCount,
    breachCount,
    generatedCount,
    sessionCount: (req.user.sessions || []).length,
  });

  // Build messages array — include last N messages for conversation context
  const priorMessages = Array.isArray(clientHistory)
    ? clientHistory.slice(-MAX_HISTORY).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content).slice(0, 2000),
      }))
    : [];

  const messages = [...priorMessages, { role: 'user', content: message.trim() }];

  // SSE headers — set before any await that could fail
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const promptHash = createHash('sha256').update(message.trim()).digest('hex');
  let inputTokens = 0, outputTokens = 0, success = false;

  try {
    const stream = ai.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
      if (chunk.type === 'message_delta' && chunk.usage) {
        outputTokens = chunk.usage.output_tokens || 0;
      }
      if (chunk.type === 'message_start' && chunk.message?.usage) {
        inputTokens = chunk.message.usage.input_tokens || 0;
      }
    }

    success = true;
    res.write('data: [DONE]\n\n');
  } catch {
    res.write(`data: ${JSON.stringify({ error: 'Six Eyes encountered an error. Please try again.' })}\n\n`);
  } finally {
    res.end();
    // Fire-and-forget audit log — never blocks the response
    AuditLog.create({
      userId: req.user._id,
      feature: 'six-eyes',
      promptHash,
      model: CHAT_MODEL,
      inputTokens,
      outputTokens,
      success,
    }).catch(() => {});
  }
};

const getLog = async (req, res) => {
  try {
    const logs = await AuditLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-userId'); // don't echo userId back
    res.json({ logs, consent: req.user.aiConsent || { accepted: false } });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { giveConsent, withdrawConsent, chat, getLog };
