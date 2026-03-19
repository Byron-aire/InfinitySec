const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const RP_NAME = process.env.RP_NAME || 'InfinitySec';

// Derive ORIGIN and RP_ID from CLIENT_ORIGIN so they are always correct
// regardless of NODE_ENV or any RP_ID env var copied from a different environment.
// CLIENT_ORIGIN is already required for CORS and is always set correctly.
const ORIGIN  = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const RP_ID   = process.env.RP_ID || new URL(ORIGIN).hostname;

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const generateToken = (user, jti) =>
  jwt.sign(
    { _id: user._id, tokenVersion: user.tokenVersion, jti },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ── Registration ──────────────────────────────────────────────────────────────

const registerOptions = async (req, res) => {
  try {
    const user = req.user;

    const options = await generateRegistrationOptions({
      rpName:      RP_NAME,
      rpID:        RP_ID,
      userID:      Buffer.from(user._id.toString()),
      userName:    user.email,
      userDisplayName: user.username,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map(pk => ({
        id:         pk.credentialID,
        transports: pk.transports,
      })),
      authenticatorSelection: {
        residentKey:      'preferred',
        userVerification: 'preferred',
      },
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (err) {
    logger.error('passkey.register_options_error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const registerVerify = async (req, res) => {
  try {
    const user = req.user;
    const { deviceName, ...attestationResponse } = req.body;

    const expectedChallenge = user.currentChallenge;
    // Clear challenge immediately — must never be reused
    user.currentChallenge = undefined;

    if (!expectedChallenge) {
      return res.status(400).json({ message: 'No challenge found. Start registration again.' });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response:          attestationResponse,
        expectedChallenge,
        expectedOrigin:    ORIGIN,
        expectedRPID:      RP_ID,
      });
    } catch (err) {
      await user.save(); // persist cleared challenge
      logger.warn('passkey.register_verify_failed', { ip: req.ip, message: err.message });
      return res.status(400).json({ message: 'Passkey registration failed. Try again.' });
    }

    if (!verification.verified || !verification.registrationInfo) {
      await user.save();
      return res.status(400).json({ message: 'Passkey verification failed.' });
    }

    // v9: credentialID/credentialPublicKey/counter are direct fields on registrationInfo
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Store as base64url so it matches what the browser returns in assertionResponse.id
    const credIDBase64url = Buffer.from(credentialID).toString('base64url');

    // Reject duplicate credential IDs
    const isDuplicate = user.passkeys.some(pk => pk.credentialID === credIDBase64url);
    if (isDuplicate) {
      await user.save();
      return res.status(400).json({ message: 'This passkey is already registered.' });
    }

    user.passkeys.push({
      credentialID:        credIDBase64url,
      credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      transports:          attestationResponse.response?.transports || [],
      deviceName:          (typeof deviceName === 'string' && deviceName.trim()) ? deviceName.trim().substring(0, 50) : 'Passkey',
    });

    await user.save();
    logger.info('passkey.registered', { ip: req.ip });

    const newKey = user.passkeys[user.passkeys.length - 1];
    res.json({ message: 'Passkey registered.', passkey: { _id: newKey._id, deviceName: newKey.deviceName, registeredAt: newKey.registeredAt } });
  } catch (err) {
    logger.error('passkey.register_verify_error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Authentication ────────────────────────────────────────────────────────────

const loginOptions = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return valid options — prevents user enumeration via response structure
    const allowCredentials = user
      ? user.passkeys.map(pk => ({ id: pk.credentialID, transports: pk.transports }))
      : [];

    const options = await generateAuthenticationOptions({
      rpID:             RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    if (user) {
      user.currentChallenge = options.challenge;
      await user.save();
    }

    res.json(options);
  } catch (err) {
    logger.error('passkey.login_options_error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const loginVerify = async (req, res) => {
  try {
    const { email, ...assertionResponse } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const expectedChallenge = user.currentChallenge;
    user.currentChallenge = undefined; // clear immediately

    if (!expectedChallenge) {
      await user.save();
      return res.status(400).json({ message: 'No challenge found. Start sign-in again.' });
    }

    const passkey = user.passkeys.find(pk => pk.credentialID === assertionResponse.id);
    if (!passkey) {
      await user.save();
      return res.status(401).json({ message: 'Passkey not found for this account.' });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response:          assertionResponse,
        expectedChallenge,
        expectedOrigin:    ORIGIN,
        expectedRPID:      RP_ID,
        // v9: parameter is 'authenticator' with Uint8Array fields
        authenticator: {
          credentialID:        Buffer.from(passkey.credentialID, 'base64url'),
          credentialPublicKey: Buffer.from(passkey.credentialPublicKey, 'base64'),
          counter:             passkey.counter,
          transports:          passkey.transports,
        },
      });
    } catch (err) {
      await user.save();
      logger.warn('passkey.login_verify_failed', { ip: req.ip, message: err.message });
      return res.status(401).json({ message: 'Passkey sign-in failed. Try again.' });
    }

    if (!verification.verified) {
      await user.save();
      return res.status(401).json({ message: 'Passkey sign-in failed.' });
    }

    // Update counter (replay attack protection)
    passkey.counter = verification.authenticationInfo.newCounter;

    // Enforce the same gates as password login
    if (user.isLocked) {
      await user.save();
      logger.warn('auth.login_blocked', { reason: 'account_locked', ip: req.ip });
      return res.status(403).json({ message: 'Account temporarily locked. Try again in 15 minutes.', code: 'ACCOUNT_LOCKED' });
    }
    if (!user.emailVerified) {
      await user.save();
      return res.status(403).json({ message: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' });
    }

    const ip        = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Prune expired sessions
    user.sessions = user.sessions.filter(
      s => Date.now() - new Date(s.createdAt).getTime() < SESSION_TTL_MS
    );

    const jti = randomUUID();
    user.sessions.push({ jti, ip, userAgent });
    if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);

    await user.save();

    logger.info('passkey.login_success', { ip });
    const token = generateToken(user, jti);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    logger.error('passkey.login_verify_error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Management ────────────────────────────────────────────────────────────────

const listPasskeys = async (req, res) => {
  try {
    const passkeys = req.user.passkeys.map(pk => ({
      _id:         pk._id,
      deviceName:  pk.deviceName,
      transports:  pk.transports,
      registeredAt: pk.registeredAt,
    }));
    res.json({ passkeys });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

const removePasskey = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const exists = user.passkeys.some(pk => pk._id.toString() === id);
    if (!exists) return res.status(404).json({ message: 'Passkey not found' });

    await User.findByIdAndUpdate(user._id, {
      $pull: { passkeys: { _id: id } },
    });

    logger.info('passkey.removed', { ip: req.ip });
    res.json({ message: 'Passkey removed' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerOptions,
  registerVerify,
  loginOptions,
  loginVerify,
  listPasskeys,
  removePasskey,
};
