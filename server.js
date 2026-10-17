const express = require("express");
const http = require("http");
const fs = require("fs");

const app = express();
// import {createRoot} from "react-dom/client";

app.get("/", (req, res) => {
    res.send("Hello, World!");
})

http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(fs.readFileSync('index.html'));
}).listen(3000);

app.listen(3000, () => {
    console.log("Server running on port 3000");
})