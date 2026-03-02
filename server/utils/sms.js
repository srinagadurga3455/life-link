// Mock SMS notification function
// In production, replace this with actual Twilio SMS service

const sendSMS = async (phoneNumber, message) => {
  try {
    // Mock Twilio SMS send
    console.log(`[MOCK SMS] To: ${phoneNumber}, Message: ${message}`);

    // In production, use:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber,
    // });

    return { success: true, message: 'SMS sent successfully (mock)' };
  } catch (error) {
    console.error('SMS Error:', error.message);
    throw new Error('Failed to send SMS');
  }
};

module.exports = {
  sendSMS,
};
