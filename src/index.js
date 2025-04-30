const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

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

// Add a proxy endpoint to directly fetch content from any URL
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ message: "Missing URL parameter" });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      responseType: 'arraybuffer',
      timeout: 15000 // 15 seconds timeout
    });

    // Set the same headers as the original response
    const contentType = response.headers['content-type'];
    res.set('Content-Type', contentType);
    
    // If it's a binary file, set appropriate headers
    if (!contentType.includes('text/') && !contentType.includes('application/json')) {
      res.set('Content-Disposition', `attachment; filename="download.${contentType.split('/')[1] || 'bin'}"`);
    }
    
    // Return the raw response
    return res.send(response.data);
  } catch (error) {
    console.error("Proxy error:", error.message);
    return res.status(502).json({ 
      message: `Failed to proxy the request: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get("/resolve-downloads", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ message: "Missing URL parameter" });
  }

  try {
    // Fetch the HTML content of the provided URL with browser-like headers
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000 // 10 seconds timeout
    });
    const $ = cheerio.load(response.data);

    let extractedUrl = null;

    // Try multiple patterns to find the URL
    
    // Method 1: Look for var url in script tags
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent) {
        // Try different patterns
        let match = scriptContent.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
        if (!match) match = scriptContent.match(/url\s*=\s*['"]([^'"]+)['"]/);
        if (!match) match = scriptContent.match(/downloadUrl\s*=\s*['"]([^'"]+)['"]/);
        if (!match) match = scriptContent.match(/file_link\s*=\s*['"]([^'"]+)['"]/);
        
        if (match) {
          extractedUrl = match[1];
          return false; // Exit loop once found
        }
      }
    });

    
    // Method 2: Look for download links with specific patterns
    if (!extractedUrl) {
      $('a[href*="download"], a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"], a.download-btn, a:contains("Download")').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && !href.includes('javascript:') && !href.includes('#')) {
          extractedUrl = href.startsWith('http') ? href : new URL(href, targetUrl).href;
          return false;
        }
      });
    }
    
    // Method 3: Look for meta tags that might contain the URL
    if (!extractedUrl) {
      $('meta[property="og:video"], meta[property="og:video:url"]').each((i, elem) => {
        const content = $(elem).attr('content');
        if (content) {
          extractedUrl = content;
          return false;
        }
      });
    }

    // Method 4: Look for data attributes that might contain URLs
    if (!extractedUrl) {
      $('[data-src], [data-url], [data-download], [data-file]').each((i, elem) => {
        const dataAttr = $(elem).attr('data-src') || $(elem).attr('data-url') || 
                         $(elem).attr('data-download') || $(elem).attr('data-file');
        if (dataAttr && dataAttr.includes('http')) {
          extractedUrl = dataAttr;
          return false;
        }
      });
    }

    if (extractedUrl) {
      return res.json({ url: extractedUrl });
    } else {
      // Return the full HTML for debugging in case no URL is found
      return res.json({ 
        message: "No direct download URL found.",
        html_sample: response.data.substring(0, 1000) // First 1000 chars for debugging
      });
    }
  } catch (error) {
    console.error("Error details:", error);
    return res
      .status(502)
      .json({ 
        message: `Failed to fetch the page: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
