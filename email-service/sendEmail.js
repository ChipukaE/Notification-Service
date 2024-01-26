const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
require("dotenv").config();

// Load the email template
const emailTemplate = fs.readFileSync("template.hbs", "utf-8");
const compiledEmailTemplate = handlebars.compile(emailTemplate);

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
};

async function sendEmailNotification(
  recipient,
  subject,
  content,
  name,
  logoUrl,
  ccRecipients,
  bccRecipients
) {
  const transporter = nodemailer.createTransport(emailConfig);

  // Compile the email template with the provided data
  const emailHtml = compiledEmailTemplate({
    subject: subject,
    content: content,
    name: name,
    logoUrl: logoUrl,
  });

  try {
    const emailOptions = {
      to: recipient,
      from: process.env.MAIL_FROM,
      subject: subject,
      text: content,
      html: emailHtml,
      cc: ccRecipients.join(", "),
      bcc: bccRecipients.join(", "),
    };

    transporter.sendMail(emailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = {
  sendEmailNotification,
};
