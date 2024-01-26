const express = require("express");
const axios = require("axios");
const { sendEmailNotification } = require("./sms-service/sendEmail");
const { sendSMSNotification } = require("./email-service/sendSms");
const knexConfig = require("./knexfile");
const knex = require("knex")(knexConfig.development);
require("dotenv").config();
const app = express();
// Function to ping APIs and send notifications
async function pingApisAndNotify() {
  try {
    const userServices = await knex("user_services").select(
      "service_id",
      "email_id",
      "contact_id"
    );

    // Ping APIs and send notifications for (
    for (const { service_id, email_id, contact_id } of userServices) {
      let service; // Declare the service variable here
      try {
        service = await knex("services")
          .where("service_id", service_id)

          .select("serviceName", "endpoint")
          .first();
        const response = await axios.get(service.endpoint);
        console.log(
          `${service.serviceName} ${service.endpoint}) is online. Response status: ${response.status}`
        );
      } catch (error) {
        console.error(`Error pinging service with ID ${service_id}:`, error);
        const errorMessage = error.message || "Unknown error";
        if (contact_id) {
          const contact = await knex("contacts")
            .where("contact_id", contact_id)

            .select("phoneNumber", "recipientName")
            .first();
          sendSMSNotification(
            contact.phoneNumber,
            `Good day Mr. ${contact.recipientName}, hope I find you well. This message serves to notify you that service ${service.serviceName} failed to respond with: ${errorMessage}`
          );
        }
        if (email_id) {
          const email = await knex("emails")
            .where("email_id", email_id)
            .select("recipient", "recipientName")
            .first();
          const ccRecipients = await knex("emails")
            .join(
              "user_services",
              "emails.email_id",
              "=",
              "user_services.email_id"
            )
            .where("user_services.service_id", service_id)
            .andWhere("emails.email_type", "cc")
            .select("emails.recipient");
          const bccRecipients = await knex("emails")
            .join(
              "user_services",
              "emails.email_id",
              "=",
              "user_services.email_id"
            )
            .where("user_services.service_id", service_id)
            .andWhere("emails.email_type", "bcc")
            .select("emails.recipient");
          const ccList = ccRecipients.map((cc) => cc.recipient);
          const bccList = bccRecipients.map((bcc) => bcc.recipient);
          const subject = process.env.MAIL_SUBJECT;
          const content = `Good day Mr.
${email.recipientName}, hope I find you well. This message serves to notify you
that service ${service.serviceName} failed to respond with: ${errorMessage}`;
          const logoUrl = process.env.LOGO_URL;
          sendEmailNotification(
            email.recipient,
            subject,
            content,
            ccList,
            bccList,
            service.serviceName,
            logoUrl
          );
        }
      }
    }
  } catch (error) {
    console.error("Error fetching user services from the database:", error);
  }
} // Interval for pinging APIs (in milliseconds)
const pingInterval = 60000; // Every 1 minute // Start the notification service
pingApisAndNotify();
setInterval(pingApisAndNotify, pingInterval); // Define an API endpoint
app.get("/api/ping", (req, res) => {
  pingApisAndNotify(); // Trigger the API pinging and notification process
  res.send("API pinging and notification triggered.");
}); // Start the Express server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
