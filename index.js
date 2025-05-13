import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(AdblockerPlugin({ blockTrackers: true }));

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
    const browser = await puppeteerExtra.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    await page.goto('https://aternos.org/go/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('input.username', { visible: true, timeout: 30000 });
    await page.type('input.username', process.env.ATERNOS_USERNAME, { delay: 50 });
    await page.type('input.password', process.env.ATERNOS_PASSWORD, { delay: 50 });

    await page.click('button.login-button');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('.server-body', { visible: true, timeout: 30000 });
    await page.click('.server-body');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#start', { visible: true, timeout: 30000 });
    await page.click('#start');
    await new Promise(resolve => setTimeout(resolve, 3000));

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
