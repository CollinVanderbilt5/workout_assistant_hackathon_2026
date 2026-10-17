const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

if (require.main === module) {
  app.listen(port, () => console.log(`RepRadar listening on http://localhost:${port}`));
}

module.exports = app;