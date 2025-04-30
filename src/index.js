const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const port = 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/test", (req, res) => {
  res.send("Test endpoint is working!");
});

app.get("/resolve-downloads", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ message: "Missing URL parameter" });
  }

  try {
    // Fetch the HTML content of the provided URL
    const response = await axios.get(targetUrl);
    const $ = cheerio.load(response.data);

    let extractedUrl = null;

    // Select all <script> tags with type="text/javascript"
    $('script[type="text/javascript"]').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent) {
        // Use regex to find: var url = "..."
        const match = scriptContent.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
          extractedUrl = match[1];
          return false; // Exit loop once found
        }
      }
    });

    if (extractedUrl) {
      return res.json({ url: extractedUrl });
    } else {
      return res.json({ message: "No direct download URL found." });
    }
  } catch (error) {
    return res
      .status(502)
      .json({ message: `Failed to fetch the page: ${error.message}` });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
