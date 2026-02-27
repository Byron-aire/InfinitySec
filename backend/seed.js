require('dotenv').config();
const mongoose = require('mongoose');
const Tip = require('./models/Tip');

const tips = [

  // ─── Passwords ───────────────────────────────────────────────
  {
    title: 'Passkeys are replacing passwords — and that\'s a good thing',
    content: 'Apple, Google, and Microsoft now support passkeys: instead of a password, your device uses your fingerprint or face to prove it\'s you. They can\'t be phished, guessed, or stolen in a database breach. Enable passkeys wherever a site offers them — look for it in account security settings.',
    category: 'Passwords',
  },
  {
    title: 'Never answer security questions honestly',
    content: 'Your first pet\'s name is probably on your Instagram from 2016. Security questions are public knowledge for anyone who\'s looked at your social media. Treat them like a second password — type random nonsense and store the answers in your password manager.',
    category: 'Passwords',
  },
  {
    title: 'Four random words beat a complex 8-character password',
    content: '\'correct-horse-battery-staple\' is far harder to crack than \'P@ssw0rd!\'. Length is what matters — a 30-character passphrase from random words has more combinations than any short complex password. Pick four unrelated words, separate them with a dash, and you\'re done.',
    category: 'Passwords',
  },
  {
    title: 'The \'change your password every 90 days\' rule is dead',
    content: 'Forced regular changes make people choose worse passwords — \'Summer2024!\' becomes \'Autumn2024!\'. Security experts now recommend: use a strong, unique password and only change it if there\'s an actual breach. Frequency matters far less than strength.',
    category: 'Passwords',
  },
  {
    title: 'Your password manager master password is the one to protect',
    content: 'Password managers were hacked (LastPass, 2022). The saving grace: your master password was never stored on their servers, so encrypted vaults were useless without it. Make your master password long and unique, enable 2FA on the manager itself, and never write it in a notes app.',
    category: 'Passwords',
  },
  {
    title: 'Biometrics are a username, not a password',
    content: 'Face ID and fingerprints are convenient, but in some countries police can legally compel you to unlock your phone biometrically — they cannot legally compel you to reveal a PIN. For your phone, use a strong PIN as backup and know when to switch to it.',
    category: 'Passwords',
  },

  // ─── Phishing ────────────────────────────────────────────────
  {
    title: 'AI writes perfect phishing emails — typos are no longer a warning sign',
    content: 'Bad grammar and spelling mistakes used to be the easiest way to spot a scam. AI tools now generate flawless, personalised emails in any language. The new test: did this message create urgency, ask you to click a link, or request information? If yes, verify through a completely different channel.',
    category: 'Phishing',
  },
  {
    title: 'Voice cloning scams: your mum\'s voice isn\'t proof it\'s your mum',
    content: 'Scammers can clone someone\'s voice from just 3 seconds of audio pulled from social media or voicemail. They use this to fake \'family emergency\' calls asking for urgent money transfers. Establish a family safe word that only you know — anyone who can\'t say it isn\'t who they claim to be.',
    category: 'Phishing',
  },
  {
    title: 'QR codes are the new dangerous link',
    content: '\'Quishing\' — QR code phishing — is surging. Fake parking fines, restaurant menus, and parcel delivery notices redirect you to credential-stealing sites. Always check the URL your phone shows after scanning before tapping \'Open\'. If it looks unfamiliar, don\'t proceed.',
    category: 'Phishing',
  },
  {
    title: 'Deepfake video calls are being used to commit fraud',
    content: 'Scammers are impersonating executives on live video calls using AI face-swapping to authorise fake wire transfers — this has cost companies millions. Warning signs: slight lip-sync delay, they won\'t turn sideways, they freeze when you ask unexpected personal questions. Always verify large requests by calling back on a known number.',
    category: 'Phishing',
  },
  {
    title: 'The display name in your email client is completely fake',
    content: '\'Apple Support\' showing in your inbox means nothing — it\'s a display name anyone can set. Click or tap the sender name to reveal the actual email address. Legitimate companies only send from their own domains. If it says apple.com but actually comes from apple-support-team.ru, it\'s a scam.',
    category: 'Phishing',
  },
  {
    title: 'Urgency is a manipulation tactic, not a feature',
    content: '\'Your account will be suspended in 24 hours.\' \'Unusual sign-in detected — verify now or lose access.\' Real companies give you time and multiple ways to respond. Scammers manufacture urgency to make you act before you think. When something feels urgent online, that\'s exactly when you should slow down.',
    category: 'Phishing',
  },

  // ─── Privacy ─────────────────────────────────────────────────
  {
    title: 'Your period and mood tracking apps are selling your data',
    content: 'Health and fitness apps are largely unregulated in terms of data sharing. Period tracking, sleep, and mental health apps have sold data to insurers and data brokers. Before logging anything personal, search \'[app name] privacy policy data sharing\'. If it\'s vague, use a local-only alternative.',
    category: 'Privacy',
  },
  {
    title: 'Browser fingerprinting tracks you even with cookies blocked',
    content: 'Websites can identify you by your unique combination of screen size, installed fonts, browser version, timezone, and graphics card — without a single cookie. A VPN doesn\'t stop this. Firefox with \'privacy.resistFingerprinting\' enabled, or the Brave browser, are the most effective defences.',
    category: 'Privacy',
  },
  {
    title: '\'Sign in with Apple\' is the most private login option',
    content: 'When you use Sign in with Apple, it can generate a unique throwaway email per app — so the company never gets your real address. It\'s significantly more private than Sign in with Google, which shares your real email, profile photo, and other account data. Use Apple\'s option wherever you see both.',
    category: 'Privacy',
  },
  {
    title: 'Data brokers are selling your home address right now',
    content: 'Sites like WhitePages, Spokeo, and BeenVerified aggregate your name, address, phone number, and family members from public records — legally. You can opt out of each site manually (search \'[site name] opt out\'), or pay a service like DeleteMe to do it automatically on an ongoing basis.',
    category: 'Privacy',
  },
  {
    title: 'Your metadata tells a story even when your messages are encrypted',
    content: 'End-to-end encrypted apps hide your message content — but not that you messaged someone, when, how often, and for how long. This metadata has been used to infer medical conditions, relationships, and political views. Signal is the only major app that actively works to minimise the metadata it generates.',
    category: 'Privacy',
  },
  {
    title: 'Smart speakers record more than you think',
    content: 'Every smart speaker continuously analyses nearby audio waiting for its wake word. Accidental triggers are recorded and, depending on your settings, reviewed by human contractors to improve accuracy. Use the physical mute button during sensitive conversations, and audit your voice history in the app regularly.',
    category: 'Privacy',
  },

  // ─── AI ──────────────────────────────────────────────────────
  {
    title: 'Don\'t type confidential information into AI chatbots',
    content: 'In 2023, Samsung engineers accidentally leaked proprietary code by pasting it into ChatGPT for debugging help. Anything you type into a public AI tool may be used to improve the model. Use the privacy settings to opt out of training data collection, or use enterprise versions your company controls.',
    category: 'AI',
  },
  {
    title: 'AI cracks weak passwords faster than ever before',
    content: 'Modern AI tools trained on billions of leaked passwords know every common pattern: @-for-a, 3-for-e, adding ! at the end, capitalising the first letter. These tricks stopped working years ago. The only thing that still helps: a long, genuinely random password from a generator — not one you made up yourself.',
    category: 'AI',
  },
  {
    title: 'Deepfake profile pictures are now indistinguishable from real ones',
    content: 'AI-generated faces are being used to create fake social profiles, fake employee directories, and fraud identities that pass basic verification checks. If a new online contact feels off, right-click their profile picture and do a reverse image search — a generated face will return no other results anywhere online.',
    category: 'AI',
  },
  {
    title: 'AI phishing is now personalised to your actual life',
    content: 'Advanced phishing tools scrape your LinkedIn, company website, and social media to write emails that reference your real job title, colleagues by name, and recent company news. A message knowing specific details about you is not proof it\'s legitimate. Verify by calling the person directly using a number you already have.',
    category: 'AI',
  },
  {
    title: 'Use AI to check suspicious emails before you click anything',
    content: 'AI assistants are genuinely useful for spotting social engineering. If you receive a suspicious message, paste the text (not any links) into an AI chat and ask: \'Is this a phishing attempt? What are the red flags?\' It can often spot manipulation patterns, urgency tactics, and impersonation attempts faster than you can.',
    category: 'AI',
  },
  {
    title: 'AI job scams are targeting people looking for remote work',
    content: 'Fake recruiters using AI-generated personas run entire interview processes — then ask for a passport photo and bank details for \'onboarding\'. The job does not exist. Before any document submission, verify the company exists on LinkedIn and their official website, confirm the recruiter\'s email matches the company domain, and never send ID before a signed formal offer.',
    category: 'AI',
  },

];

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    await Tip.deleteMany({});
    await Tip.insertMany(tips);
    console.log(`Seeded ${tips.length} tips successfully`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
