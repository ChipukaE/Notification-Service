const axios = require("axios");
const { sendEmailNotification } = require("../email-service/sendEmail");
const { sendSMSNotification } = require("../sms-service/sendSms");
const {
  sendWhatsAppMessage,
  whatsappRecipients,
} = require("../whatsapp/whatsapp");
const moment = require("moment");
const winston = require("winston");
require("dotenv").config();

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
    // new WinstonWhatsApp({ level: "error" }),
  ],
});

log.add(
  new winston.transports.Console(() => {
    format: winston.format.simple();
  })
);

const apiEndpoints = [
  { name: "Marshy", endpoint: process.env.API_ENDPOINT_1 },
  { name: "Deployment System", endpoint: process.env.API_ENDPOINT_2 },
  { name: "Customer Care", endpoint: process.env.API_ENDPOINT_3 },
];

const smsPhoneNumbers = process.env.SMS_PHONE_NUMBERS.split(",");
const emailRecipients = process.env.EMAIL_RECIPIENT.split(",");
const ccRecipients = process.env.CC_RECIPIENT.split(",");
const bccRecipients = process.env.BCC_RECIPIENT.split(",");

async function pingApisAndNotify() {
  try {
    for (const { name, endpoint } of apiEndpoints) {
      try {
        const response = await axios.get(endpoint);
        log.log({
          level: "info",
          message: `${DD} ${name} (${endpoint}) is online. Response status: ${response.status}`,
        });
      } catch (error) {
        log.log({
          level: "error",
          message: `${DD} Error pinging service ${name} (${endpoint}):`,
          error,
        });

        const errorMessage = error.message || "Unknown error";

        for (const number of smsPhoneNumbers) {
          try {
            sendSMSNotification(
              number,
              `Good day, hope I find you well. This message serves to notify you that service ${name} failed to respond with: ${errorMessage}`
            );
          } catch (smsError) {
            log.log({
              level: "error",
              message: `${DD} Error sending SMS notification to ${number}:`,
              smsError,
            });
          }
        }

        const subject = process.env.MAIL_SUBJECT;
        const content = `Good day, hope I find you well. This message serves to notify you that service ${name} failed to respond with: ${errorMessage}`;
        const logoUrl = process.env.LOGO_URL;

        for (const recipient of emailRecipients) {
          try {
            sendEmailNotification(
              recipient,
              subject,
              content,
              name,
              logoUrl,
              ccRecipients,
              bccRecipients
            );
          } catch (emailError) {
            log.log({
              level: "error",
              message: `${DD} Error sending email notification to ${recipient}:`,
              emailError,
            });
          }
        }

        for (const recipient of whatsappRecipients) {
          try {
            sendWhatsAppMessage(
              recipient.url,
              recipient.chatId,
              `${name} failed to respond with: ${errorMessage}`
            );
          } catch (whatsappError) {
            log.log({
              level: "error",
              message: `${DD} Error sending WhatsApp message to ${recipient.url} (Chat ID: ${recipient.chatId}):`,
              whatsappError,
            });
          }
        }
      }
    }
  } catch (mainError) {
    log.log({
      level: "error",
      message: `${DD} An error occurred in the main process:`,
      mainError,
    });
  }
}

module.exports = {
  pingApisAndNotify,
};
