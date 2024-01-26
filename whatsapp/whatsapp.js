"use strict";
const http = require("http");
const {
  Client,
  MessageMedia,
  Location,
  LocalAuth,
} = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

const displaydate = () => moment().format("DD/MM/YYYY-HH:mm:ss");

global.DD = displaydate();
global.log = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  defaultMeta: { Service: "Marshy" },
  transports: [
    new winston.transports.File({
      filename: "./logs/bot/warn.log",
      level: "warn",
    }),
    new winston.transports.File({
      filename: "./logs/bot/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "./logs/bot/info.log",
      level: "info",
    }),
    new WinstonWhatsApp({ level: "error" }),
  ],
});

const port = process.env.PORT || 3005;

log.add(
  new winston.transports.Console(() => {
    format: winston.format.simple();
  })
);

let ready = false;

const client = new Client({
  puppeteer: { headless: true, args: ["--disable-dev-shm-usage"] },
  authStrategy: new LocalAuth(),
});

client.initialize();

client.on("qr", (qr) => {
  log.log({
    level: "error",
    message: `${DD} Possible AUTH Event, QRCODE Received`,
  });
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("WhatsApp Forwarder Ready...");

  const chats = await client.getChats();
  const groups = chats
    .filter((chat) => chat.isGroup)
    .map((chat) => {
      return {
        id: chat.id._serialized, // ***********-**********@g.us
        name: chat.name, // Your Group Name
      };
    });

  console.log(groups);
  ready = true;
});

client.on("change_state", (state) => {
  console.log("STATE CHANGED TO:  ", state);
  if (state === "CONNECTED") {
    // Additional actions when the client is connected
  }
});

client.on("auth_failure", (msg) => {
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("error", (msg) => {
  console.error("error", msg);
});

client.on("disconnected", (reason) => {
  console.log("Client was logged out", reason);
});

const whatsappRecipients = JSON.parse(process.env.WHATSAPP_RECIPIENTS);

const sendWhatsAppMessage = (url, chatId, message) => {
  const endpoint = whatsappRecipients.find((config) => config.url === url);

  if (!endpoint) {
    console.log(`Invalid URL: ${url}`);
    return;
  }

  if (!ready) {
    console.log("WhatsApp not ready");
    return;
  }

  client
    .sendMessage(chatId, message)
    .then(() => {
      console.log(`Message sent to ${chatId}`);
    })
    .catch((error) => {
      console.error(`Error sending message to ${chatId}:`, error);
    });
};

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const chatId = req.headers["x-chat-id"];
  const message = decodeURIComponent(req.url).split("message=")[1];

  if (!url || !chatId || !message) {
    res.statusCode = 400;
    res.end("Bad Request");
    return;
  }

  sendWhatsAppMessage(url, chatId, message);

  res.statusCode = 200;
  res.end("Message Sent");
});

server.listen(port, () => {
  console.log(`Forwarder running on port ${port}`);
});
