const twilio = require('twilio');

let client = null;

function getClient() {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

async function sendSMS(to, message) {
  const twilioClient = getClient();
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }
  return await twilioClient.messages.create({
    body: message,
    to: to,
    from: process.env.TWILIO_PHONE_NUMBER
  });
}

async function sendBatchSMS(recipients, message) {
  const twilioClient = getClient();
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }
  const results = await Promise.all(
    recipients.map(to => sendSMS(to, message))
  );
  return results;
}

const templates = {
  appointment: "Your HVAC appointment is scheduled for {date} at {time}.",
  reminder: "Reminder: Your HVAC service is tomorrow at {time}.",
  confirmation: "Thank you for scheduling with Mark Jacob HVAC!"
};

module.exports = { sendSMS, sendBatchSMS, templates };
