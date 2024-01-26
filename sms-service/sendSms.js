const axios = require("axios");
require("dotenv").config(); // Load environment variables from .env file

async function sendSMSNotification(phoneNumber, message) {
  const baseUrl = process.env.TXTCO_BASE_URL;
  const sendingNumber = process.env.TXTCO_SENDING_NUMBER;
  const username = process.env.TXTCO_USERNAME;

  const url = new URL(baseUrl);

  // Set query parameters
  url.searchParams.append("sending_number", sendingNumber);
  url.searchParams.append("username", username);
  url.searchParams.append("recipients", phoneNumber);
  url.searchParams.append("body", message);

  try {
    const response = await axios.post(url.toString(), {
      phoneNumber: phoneNumber,
      message: message,
    });
    console.log(
      `SMS notification sent to ${phoneNumber}. Response:`,
      response.data
    );
  } catch (error) {
    console.error(`Error sending SMS notification to ${phoneNumber}:`, error);
  }
}

module.exports = {
  sendSMSNotification,
};
