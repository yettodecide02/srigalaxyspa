const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendNotification(formData) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NOTIFICATION_EMAIL,
        pass: process.env.NOTIFICATION_PASSWORD,
      },
    });

    const submissionDate = new Date(formData.timestamp).toLocaleString(
      "en-US",
      {
        dateStyle: "full",
        timeStyle: "short",
      }
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 20px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #555; }
          .value { margin-top: 5px; padding: 10px; background-color: #f5f5f5; border-left: 3px solid #4CAF50; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Spa Booking Received!</h1>
          </div>
          <div class="content">
            <p><strong>Submission Time:</strong> ${submissionDate}</p>
            <div class="field">
              <div class="label">📋 Service:</div>
              <div class="value">${formData.service}</div>
            </div>
            <div class="field">
              <div class="label">📅 Appointment Date:</div>
              <div class="value">${formData.date}</div>
            </div>
            <div class="field">
              <div class="label">🕐 Appointment Time:</div>
              <div class="value">${formData.time}</div>
            </div>
            <div class="field">
              <div class="label">👤 Customer Name:</div>
              <div class="value">${formData.firstName}</div>
            </div>
            <div class="field">
              <div class="label">📧 Email:</div>
              <div class="value"><a href="mailto:${formData.email}">${
      formData.email
    }</a></div>
            </div>
            <div class="field">
              <div class="label">📞 Phone:</div>
              <div class="value"><a href="tel:${formData.phone}">${
      formData.phone
    }</a></div>
            </div>
            ${
              formData.message
                ? `<div class="field"><div class="label">💬 Message:</div><div class="value">${formData.message}</div></div>`
                : ""
            }
            <div class="footer">
              <p>This is an automated notification from Relax Thai Spa booking system.</p>
              <p>Please respond to the customer as soon as possible.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      New Spa Booking Received!

      Submission Time: ${submissionDate}

      Service: ${formData.service}
      Appointment Date: ${formData.date}
      Appointment Time: ${formData.time}
      Customer Name: ${formData.firstName}
      Email: ${formData.email}
      Phone: ${formData.phone}
      ${formData.message ? `Message: ${formData.message}` : ""}

      ---
      This is an automated notification from Relax Thai Spa booking system.
    `;

    const mailOptions = {
      from: `"Relax Thai Spa" <${process.env.NOTIFICATION_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🎉 New Booking: ${formData.service} - ${formData.firstName}`,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    throw new Error(`Failed to send notification: ${error.message}`);
  }
}

module.exports = {
  sendNotification,
};
