const express = require("express");
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


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
