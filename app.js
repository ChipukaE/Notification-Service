const express = require("express");
const amqp = require("amqplib");
require("dotenv").config();

const { pingApisAndNotify } = require("./controller/notifier");

const app = express();

let channel;
const pingInterval = process.env.PING_INTERVAL;

// Connect to RabbitMQ and setup channel and queue
async function setupRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel(); // Assign the channel here

    const queueName = "api_ping";
    await channel.assertQueue(queueName);

    // Consume messages from the queue
    channel.consume(queueName, (message) => {
      if (message !== null) {
        console.log(`Received message: ${message.content.toString()}`);
        pingApisAndNotify(channel);
        channel.ack(message);
      }
    });
  } catch (error) {
    console.error("Error setting up RabbitMQ:", error);
  }
}

pingApisAndNotify(channel);
setInterval(() => pingApisAndNotify(channel), pingInterval);

app.get("/api/ping", (req, res) => {
  const message = "Ping API requested";
  channel.sendToQueue("api_ping", Buffer.from(message));
  res.send("API pinging and notification triggered.");
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  setupRabbitMQ();
});
