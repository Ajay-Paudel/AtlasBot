import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import fs from 'fs';
import path from 'path';

puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(AdblockerPlugin({ blockTrackers: true }));

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR);
}

console.log('BROWSERLESS_TOKEN:', process.env.BROWSERLESS_TOKEN);
console.log('ATERNOS_USERNAME:', process.env.ATERNOS_USERNAME);
console.log('ATERNOS_PASSWORD:', process.env.ATERNOS_PASSWORD);
console.log('ATERNOS_SERVER_URL:', process.env.ATERNOS_SERVER_URL);
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.content === '!start') {
    message.reply('Starting your Aternos server... please wait ⏳');
    try {
      await startAternosServer();
      message.channel.send('✅ Aternos server is starting!');
    } catch (err) {
      console.error('Error in !start command:', err);
      message.channel.send('❌ Failed to start the server.');
    }
  }
});

async function startAternosServer() {
  try {
    console.log('Connecting to browserless.io with stealth...');
    const browser = await puppeteerExtra.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    console.log('Opening Aternos login page...');
    await page.goto('https://aternos.org/go/', { waitUntil: 'domcontentloaded' });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/aternos-login.png` });
    console.log('📸 Screenshot saved: aternos-login.png');

    console.log('Waiting for username field...');
    await page.waitForSelector('input.username', { visible: true, timeout: 30000 });

    console.log('Typing username...');
    await page.type('input.username', process.env.ATERNOS_USERNAME, { delay: 50 });

    console.log('Typing password...');
    await page.type('input.password', process.env.ATERNOS_PASSWORD, { delay: 50 });

    console.log('Clicking login button...');
    await page.click('button.login-button');

    console.log('Waiting for post-login navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/aternos-after-login.png` });
    console.log('📸 Screenshot saved: aternos-after-login.png');

    // Click on the server card
    console.log('Clicking on the server "Ajay9999999"...');
    console.log('Waiting for server card...');
    await page.waitForSelector('.server-body', { visible: true, timeout: 30000 });

    console.log('Clicking on your server card...');
    await page.click('.server-body'); // This clicks the entire card, not just the text

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/after-clicking-server.png` });
    console.log('📸 Screenshot saved: after-clicking-server.png');


    // Wait and click the Start button
    console.log('Waiting for the Start button...');
    await page.waitForSelector('#start', { visible: true, timeout: 30000 });
    console.log('✅ Start button is visible!');

    console.log('Starting the server...');
    await page.click('#start');
    await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 seconds
    await page.screenshot({ path: `${SCREENSHOT_DIR}/server-start-clicked.png` });
    console.log('📸 Screenshot saved: server-start-clicked.png');

    await browser.disconnect();

  } catch (error) {
    console.error('❌ Error starting Aternos server:', error);
    throw error;
  }
}

client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('✅ Discord bot logged in successfully!');
  })
  .catch((err) => {
    console.error('❌ Error logging in to Discord bot:', err);
  });
