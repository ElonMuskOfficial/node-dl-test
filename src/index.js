const express = require("express");
const cors = require("cors");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');

// Configure stealth plugin with additional settings chek 1
puppeteer.use(StealthPlugin({
  // These options make the stealth plugin more aggressive
  enableOnHeadless: true,
  hideWebDriver: true,
  mockChrome: true,
  mockDeviceMemory: 8,
  mockDeviceScaleFactor: 2
}));

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/test", (req, res) => {
  res.send("Test endpoint is working!");
});

// Enhanced scraping endpoint
app.get('/scrape', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    
    // Configure human-like behavior
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false
    });
    
    // Randomize user agent
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    await page.setUserAgent(userAgent.toString());
    
    // Set human-like headers
    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'upgrade-insecure-requests': '1'
    });

    // Simulate human-like navigation
    await page.goto('https://google.com', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Now go to target URL with human-like delay
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
      referer: 'https://google.com'
    });
    
    // Random mouse movements and clicks
    await page.mouse.move(
      Math.random() * 800,
      Math.random() * 600
    );
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    
    // Get page content after potential Cloudflare challenge
    const title = await page.title();
    const content = await page.content();
    
    await browser.close();
    
    res.json({ 
      success: true,
      title,
      contentLength: content.length,
      message: `Successfully scraped ${url}` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
