const nodemailer = require('nodemailer');

// Create reusable transporter (Etheral test account or ENV credentials fallback)
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Development fallback using Ethereal test account or mock transport
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('Nodemailer initialized with Ethereal test account:', testAccount.user);
    } catch (err) {
      console.warn('Failed to create Ethereal account, using direct mock log transport:', err.message);
      transporter = {
        sendMail: async (mailOptions) => {
          console.log(`[MOCK EMAIL SENT] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
          return { messageId: `mock_${Date.now()}` };
        }
      };
    }
  }

  return transporter;
}

/**
 * Sends magic link invitation emails to student roster and a summary receipt to faculty.
 */
async function sendBulkQuizInvites({ roster, quiz, facultyEmail, frontendUrl }) {
  const mailer = await getTransporter();
  const results = { sent: 0, failed: 0, previewUrls: [] };
  const baseUrl = (frontendUrl || 'http://localhost:5173').replace(/\/$/, '');

  for (const student of roster) {
    const magicLink = `${baseUrl}/#/join?code=${encodeURIComponent(quiz.quizCode)}&reg=${encodeURIComponent(student.regNo)}&name=${encodeURIComponent(student.name)}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff7ed; padding: 24px; border-radius: 12px; border: 1px solid #ffedd5;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #c2410c; font-size: 24px; margin: 0;">⚡ Quiz Genius LMS</h1>
          <p style="color: #9a3412; font-size: 14px; margin-top: 4px;">Online Assessment Invitation</p>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h2 style="color: #431407; font-size: 18px; margin-top: 0;">Hello, ${student.name}!</h2>
          <p style="color: #7c2d12; font-size: 14px;">
            You have been registered for an upcoming online assessment: <strong>${quiz.title}</strong>.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #fff7ed; padding: 12px; border-radius: 6px;">
            <tr>
              <td style="padding: 8px; color: #9a3412; font-weight: bold;">Quiz Code:</td>
              <td style="padding: 8px; color: #c2410c; font-weight: bold; font-size: 16px;">${quiz.quizCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #9a3412; font-weight: bold;">Reg No:</td>
              <td style="padding: 8px; color: #431407;">${student.regNo}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #9a3412; font-weight: bold;">Duration:</td>
              <td style="padding: 8px; color: #431407;">${quiz.durationMinutes || 30} Mins</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${magicLink}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
              Join Quiz Instantly &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #9a3412; text-align: center;">
            If the button doesn't work, copy & paste this link into your browser:<br>
            <a href="${magicLink}" style="color: #ea580c;">${magicLink}</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #9a3412; font-size: 12px;">
          Quiz Genius LMS &bull; Automated System Dispatch
        </div>
      </div>
    `;

    try {
      const info = await mailer.sendMail({
        from: '"Quiz Genius LMS" <no-reply@quizgenius.lms>',
        to: student.email,
        subject: `[Quiz Genius] Join Quiz: ${quiz.title} (${quiz.quizCode})`,
        html: htmlContent
      });

      results.sent++;
      if (nodemailer.getTestMessageUrl && info) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) results.previewUrls.push({ email: student.email, url: previewUrl });
      }
    } catch (err) {
      console.error(`Error sending email to ${student.email}:`, err);
      results.failed++;
    }
  }

  // Send single summary receipt email to faculty member
  if (facultyEmail) {
    const summaryHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff7ed; padding: 24px; border-radius: 12px;">
        <h2 style="color: #c2410c; margin-top: 0;">⚡ Roster Dispatch Confirmation Receipt</h2>
        <p>Your bulk invitation loop for quiz <strong>"${quiz.title}" (${quiz.quizCode})</strong> has completed.</p>
        <ul>
          <li><strong>Total Roster Count:</strong> ${roster.length}</li>
          <li><strong>Successfully Dispatched:</strong> ${results.sent}</li>
          <li><strong>Failed Dispatches:</strong> ${results.failed}</li>
        </ul>
        <p style="color: #7c2d12;">Students can now use their personalized magic links to auto-bypass the join form and begin their quiz.</p>
      </div>
    `;

    try {
      await mailer.sendMail({
        from: '"Quiz Genius LMS" <no-reply@quizgenius.lms>',
        to: facultyEmail,
        subject: `[Dispatch Summary] Invites Sent for ${quiz.quizCode} - ${quiz.title}`,
        html: summaryHtml
      });
    } catch (err) {
      console.error('Error sending faculty receipt:', err);
    }
  }

  return results;
}

module.exports = {
  sendBulkQuizInvites
};
