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
  {
    title: 'Check HaveIBeenPwned before reusing any password',
    content: 'Before using a password you\'ve used before — even on a brand-new site — check haveibeenpwned.com to see if it appeared in a known breach. If it did, it\'s already in attacker wordlists regardless of how complex it looks. A breached password should be retired permanently.',
    category: 'Passwords',
  },
  {
    title: 'Sharing passwords over text or email is a breach in waiting',
    content: 'Email and SMS are not encrypted in transit and persist indefinitely in your inbox, sent items, and potentially cloud backups. If you must share a credential, use an encrypted tool like 1Password\'s item sharing or Bitwarden\'s send — they create a one-time link that expires. Never copy-paste a password into a chat.',
    category: 'Passwords',
  },
  {
    title: 'Delete old accounts — they\'re targets you\'re not defending',
    content: 'That forum you signed up for in 2014, the startup that pivoted, the shopping site you used once — all of them stored your email and probably a hashed password. When they get breached (and they will), your credentials are out there. Google \'delete account [service name]\' and close anything you no longer use.',
    category: 'Passwords',
  },
  {
    title: 'Single sign-on at work means one stolen password loses everything',
    content: 'SSO systems like Okta, Azure AD, or Google Workspace let one login unlock every work tool. Convenient — and catastrophic when compromised. If your organisation uses SSO, your work account password and its MFA device are your most important credentials. Treat them accordingly.',
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
  {
    title: 'Lookalike domains are designed to trick your eyes',
    content: 'paypaI.com (capital i) versus paypal.com. arnazon.com versus amazon.com. rnicrosoft.com versus microsoft.com. Attackers register visually identical domains and build convincing clones on them. Before entering any credentials, look at the full domain in the browser\'s address bar — not just the page content.',
    category: 'Phishing',
  },
  {
    title: 'SMS phishing (smishing) is now more dangerous than email phishing',
    content: 'Most people have been trained to distrust email scams but still trust SMS. Smishing messages impersonate banks, couriers, and tax authorities with near-perfect precision. Never click a link in an unsolicited text. Go directly to the company\'s official app or website by typing the address yourself.',
    category: 'Phishing',
  },
  {
    title: 'The padlock icon doesn\'t mean a website is safe',
    content: 'HTTPS and the padlock only mean your connection to the server is encrypted — they say nothing about what the server does with your data. Phishing sites routinely use valid SSL certificates. A padlock on a page asking for your bank login proves nothing except the scammers bothered with a certificate.',
    category: 'Phishing',
  },
  {
    title: 'Phishing kits can steal your 2FA code in real time',
    content: 'Adversary-in-the-middle (AiTM) phishing proxies sit between you and a real website, relaying your login and intercepting your 2FA code before you see the confirmation. SMS and TOTP codes are vulnerable to this. FIDO2 hardware keys and passkeys are the only authentication methods immune to this attack.',
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
  {
    title: 'Your photo EXIF data contains GPS coordinates and device info',
    content: 'Every photo taken on a modern phone contains embedded metadata: exact GPS location, camera model, timestamp, and sometimes altitude. When you upload photos to social media or send them directly, this data can be extracted trivially. Most social platforms strip it on upload — but direct sends (WhatsApp, email) do not.',
    category: 'Privacy',
  },
  {
    title: 'Incognito mode doesn\'t hide you from your ISP or employer',
    content: 'Private browsing only prevents your browser from saving history locally. Your ISP, employer network, school, or any router you\'re connected through still sees every domain you visit. Incognito is useful for keeping browsing off your device — it provides no network-level privacy whatsoever.',
    category: 'Privacy',
  },
  {
    title: 'Your advertising ID follows you everywhere across apps',
    content: 'iOS and Android both assign your phone a unique advertising identifier (IDFA on iOS, GAID on Android). Every app you install can read this ID and share it with ad networks, building a profile of everything you do across all your apps. On iOS: Settings > Privacy > Tracking > disable. On Android: Settings > Google > Ads > delete your advertising ID.',
    category: 'Privacy',
  },
  {
    title: 'Alias email addresses protect your real inbox',
    content: 'Services like SimpleLogin, AnonAddy, and Apple\'s Hide My Email let you generate unique email addresses for every signup. When a service is breached or sells your data, only the alias is exposed. You can disable a single alias without affecting anything else. This also lets you identify exactly who sold your email.',
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
  {
    title: 'AI models hallucinate security advice — always verify',
    content: 'AI chatbots confidently recommend outdated or simply wrong security practices. They may suggest deprecated encryption standards, reference CVEs that don\'t exist, or give firewall rules with subtle errors. Treat AI-generated security guidance as a starting point for research, not authoritative instruction. Cross-check with official documentation.',
    category: 'AI',
  },
  {
    title: 'AI-powered OSINT can find your address from background details',
    content: 'Open-source intelligence tools combined with AI can identify your approximate location from a photo\'s background — street signs, shop fronts, architecture, vegetation. Researchers have pinpointed addresses from selfies. Before posting photos online, check what\'s visible behind you, especially from home.',
    category: 'AI',
  },
  {
    title: 'AI code generation can silently introduce security vulnerabilities',
    content: 'GitHub Copilot, ChatGPT, and similar tools generate plausible-looking code that regularly contains SQL injection flaws, missing input validation, hardcoded secrets, and insecure cryptography. A Stanford study found 40% of Copilot-generated security-sensitive code contained vulnerabilities. Review AI-generated code with the same scrutiny as code from an untrusted third party.',
    category: 'AI',
  },
  {
    title: 'Prompt injection can hijack AI assistants acting on your behalf',
    content: 'When AI tools read emails, browse the web, or process documents on your behalf, malicious text in that content can redirect the AI\'s actions — a technique called prompt injection. A compromised email could instruct an AI email assistant to forward your messages elsewhere. Treat AI agent outputs with the same scepticism as user input.',
    category: 'AI',
  },

  // ─── Network ─────────────────────────────────────────────────
  {
    title: 'Public Wi-Fi is an open window into your unencrypted traffic',
    content: 'Café, airport, and hotel Wi-Fi networks are shared with strangers. Anyone on the same network can use free tools to intercept unencrypted traffic. HTTPS protects most web browsing today, but apps, DNS queries, and some services still send data in plaintext. Use a trusted VPN on any network you don\'t control, or use mobile data instead.',
    category: 'Network',
  },
  {
    title: 'Your home router\'s admin password is probably still \'admin\'',
    content: 'Every router ships with default credentials printed on the back — and those defaults are published in public databases. Attackers on your network (or sometimes from outside) can log in, redirect your DNS, and intercept all your traffic without touching any of your devices. Change the admin username and password immediately and disable remote management.',
    category: 'Network',
  },
  {
    title: 'DNS-over-HTTPS stops your ISP from reading every site you visit',
    content: 'By default, DNS queries — the lookups that translate domain names to IP addresses — are sent unencrypted to your ISP, who logs them. DNS-over-HTTPS (DoH) encrypts these lookups. Enable it in Firefox (Settings > Privacy > DNS over HTTPS), Chrome (Settings > Security > Secure DNS), or configure it directly on your router with Cloudflare\'s 1.1.1.1 or NextDNS.',
    category: 'Network',
  },
  {
    title: 'VPNs move your trust, they don\'t eliminate it',
    content: 'A VPN hides your traffic from your ISP and replaces your IP on websites — but your VPN provider now sees everything your ISP did before. When choosing a VPN, look for: an independently audited no-logs policy, a jurisdiction with strong privacy laws, and open-source clients. Free VPNs almost universally monetise your data. Mullvad and ProtonVPN are consistently well-regarded.',
    category: 'Network',
  },
  {
    title: 'Your phone randomises its MAC address — keep that feature on',
    content: 'Retailers and venues track foot traffic by passively logging the Wi-Fi probe requests your phone broadcasts, which historically contained your unique MAC address. Modern iOS and Android randomise this address per network to prevent cross-location tracking. Never disable MAC randomisation for public networks — only disable it for your own trusted home network if required.',
    category: 'Network',
  },
  {
    title: 'A guest network is one of the best home security decisions you can make',
    content: 'Put your smart TVs, thermostats, cameras, and other IoT devices on a separate guest network isolated from your main network where laptops and phones live. If an IoT device is compromised, it cannot reach your personal devices. Almost every modern router supports this — it takes five minutes to set up and significantly limits breach damage.',
    category: 'Network',
  },
  {
    title: 'WPA3 is the only Wi-Fi security standard you should accept in 2025',
    content: 'WPA2 has known vulnerabilities including KRACK attacks and offline dictionary attacks against weak passwords. WPA3 addresses both with improved handshake encryption (SAE) and forward secrecy. Check your router settings — if it offers WPA3 or WPA2/WPA3 transition mode, enable it. If your router only supports WPA2, it\'s worth upgrading.',
    category: 'Network',
  },
  {
    title: 'UPnP on your router automatically opens ports for attackers',
    content: 'Universal Plug and Play (UPnP) lets devices on your network request that the router open specific ports to the internet — automatically, with no authentication. Malware routinely abuses this to create persistent backdoors. Unless you specifically need UPnP for a gaming console or media server, disable it in your router admin panel.',
    category: 'Network',
  },

  // ─── Devices ─────────────────────────────────────────────────
  {
    title: 'Automatic updates are security patches in disguise',
    content: 'The majority of successful malware attacks exploit known vulnerabilities with patches already available. Attackers routinely reverse-engineer security updates to build exploits targeting the people who haven\'t installed them yet. Enable automatic updates for your OS, browser, and all apps. The inconvenience of an update is nothing compared to a breach.',
    category: 'Devices',
  },
  {
    title: 'Your old phone is a security risk even when switched off',
    content: 'An old phone sitting in a drawer likely runs an OS version receiving no security patches, stores years of personal data, and may have accounts still logged in. Before retiring any device, perform a factory reset after removing it from all accounts. On Android, enable encryption before the reset to make recovery of residual data harder.',
    category: 'Devices',
  },
  {
    title: 'USB charging cables from strangers can compromise your device',
    content: 'Modified USB cables — including the O.MG cable that looks identical to a real Apple cable — can contain hardware implants capable of running keyloggers and executing remote commands. Never use a charging cable you didn\'t buy yourself. At airports or hotels, use your own cable and power adapter, or use a USB data blocker (a \'USB condom\') to block data pins.',
    category: 'Devices',
  },
  {
    title: 'Full-disk encryption is non-negotiable on any laptop',
    content: 'If your laptop is stolen and the storage isn\'t encrypted, the thief removes the drive, plugs it into another computer, and reads everything — passwords, files, browser sessions, everything. BitLocker (Windows), FileVault (macOS), and LUKS (Linux) encrypt everything at rest. Enable it now. On modern Macs with Apple Silicon, encryption is on by default.',
    category: 'Devices',
  },
  {
    title: 'A webcam cover costs £2 and stops a real attack vector',
    content: 'Remote access trojans (RATs) routinely activate webcams silently, with no indicator light. Former FBI Director James Comey covered his webcam. The CIA\'s hacking tools, leaked in Vault 7, included webcam access capabilities. A physical camera cover is an absolute defence against this. Use one on every laptop.',
    category: 'Devices',
  },
  {
    title: 'IoT devices are the least-patched things on your network',
    content: 'Smart cameras, doorbells, TVs, and appliances often run embedded Linux with years-old software and no update mechanism. The Mirai botnet infected millions of cameras with default credentials alone. Change default passwords on every IoT device, check the manufacturer\'s site for firmware updates, and isolate them on a guest network away from your personal devices.',
    category: 'Devices',
  },
  {
    title: 'App permissions are a direct window into what apps actually do',
    content: 'A flashlight app requesting microphone access has no legitimate reason for it. A game requesting contacts is suspicious. Review permissions for every app you install. On iOS: Settings > Privacy & Security. On Android: Settings > Privacy > Permission Manager. Revoke anything that doesn\'t make sense for the app\'s stated purpose.',
    category: 'Devices',
  },
  {
    title: 'Your lock screen is leaking sensitive information',
    content: 'By default, most phones display full message previews on the lock screen — including verification codes, bank alerts, and personal messages — visible to anyone glancing at your phone. Disable lock screen message previews: on iOS, Settings > Notifications > Show Previews > When Unlocked. On Android, Settings > Notifications > Notifications on lock screen > Hide sensitive content.',
    category: 'Devices',
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
    process.stderr.write(`Seed error: ${err}\n`);
    process.exit(1);
  });
