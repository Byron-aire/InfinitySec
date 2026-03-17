require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const PasswordCheck = require('./models/PasswordCheck');

const DEMO_EMAIL    = 'demo@infinitysec.io';
const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'Demo1234!';

const history = [
  // --- Strength checks ---
  {
    type: 'strength',
    input: null,
    result: {
      score: 22,
      label: 'Weak',
      criteria: [
        { label: 'At least 8 characters', met: false },
        { label: 'Uppercase letter', met: false },
        { label: 'Lowercase letter', met: true },
        { label: 'Number', met: false },
        { label: 'Symbol', met: false },
      ],
    },
  },
  {
    type: 'strength',
    input: null,
    result: {
      score: 54,
      label: 'Fair',
      criteria: [
        { label: 'At least 8 characters', met: true },
        { label: 'Uppercase letter', met: true },
        { label: 'Lowercase letter', met: true },
        { label: 'Number', met: false },
        { label: 'Symbol', met: false },
      ],
    },
  },
  {
    type: 'strength',
    input: null,
    result: {
      score: 88,
      label: 'Very Strong',
      criteria: [
        { label: 'At least 8 characters', met: true },
        { label: 'Uppercase letter', met: true },
        { label: 'Lowercase letter', met: true },
        { label: 'Number', met: true },
        { label: 'Symbol', met: true },
      ],
    },
  },

  // --- Breach checks ---
  {
    type: 'breach',
    input: null,
    result: {
      breached: true,
      breachCount: 4,
      breaches: ['Adobe', 'LinkedIn', 'Dropbox', 'Canva'],
    },
  },
  {
    type: 'breach',
    input: null,
    result: {
      breached: false,
      breachCount: 0,
      breaches: [],
    },
  },
  {
    type: 'breach',
    input: null,
    result: {
      breached: true,
      breachCount: 2,
      breaches: ['Twitter', 'Trello'],
    },
  },

  // --- Generated passwords ---
  {
    type: 'generated',
    input: null,
    result: {
      password: 'Xk7#mPqR2vNsLw9Y',
      length: 16,
      options: { upper: true, lower: true, digits: true, symbols: true },
      name: 'Gmail',
    },
  },
  {
    type: 'generated',
    input: null,
    result: {
      password: 'nB4jQzTh8cFpWdAe',
      length: 16,
      options: { upper: true, lower: true, digits: true, symbols: false },
      name: 'Netflix',
    },
  },
  {
    type: 'generated',
    input: null,
    result: {
      password: 'K9$rVmU3@nXoEy6#LqP1!tZw',
      length: 24,
      options: { upper: true, lower: true, digits: true, symbols: true },
      name: 'Banking',
    },
  },
  {
    type: 'generated',
    input: null,
    result: {
      password: 'dGhQzJkMrStBpCfN',
      length: 16,
      options: { upper: true, lower: true, digits: false, symbols: false },
      name: null,
    },
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    process.stdout.write('Demo user already exists. Skipping.\n');
    process.stdout.write(`Email: ${DEMO_EMAIL}\nPassword: ${DEMO_PASSWORD}\n`);
    await mongoose.disconnect();
    return;
  }

  const user = await User.create({
    username: DEMO_USERNAME,
    email:    DEMO_EMAIL,
    password: DEMO_PASSWORD,
    emailVerified: true, // Demo account skips email verification
  });

  const now = new Date();
  const entries = history.map((entry, i) => ({
    ...entry,
    userId: user._id,
    createdAt: new Date(now - (history.length - i) * 24 * 60 * 60 * 1000),
  }));

  await PasswordCheck.insertMany(entries);

  process.stdout.write('Demo user created.\n');
  process.stdout.write(`Email: ${DEMO_EMAIL}\nPassword: ${DEMO_PASSWORD}\n`);
  process.stdout.write(`History entries: ${entries.length}\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
