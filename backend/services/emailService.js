const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (smtpUser && smtpPass) {
    try {
      if (smtpHost) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT, 10) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000
        });
      } else {
        // Gmail / standard service fallback
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000
        });
      }
      console.log(`📧 Nodemailer initialized for user: ${smtpUser}`);
    } catch (e) {
      console.warn('Transporter init error:', e.message);
    }
  }

  // Fallback to Instant Simulation Transport if no credentials
  if (!transporter) {
    transporter = {
      isSimulated: true,
      sendMail: async (mailOptions) => {
        console.log(`[SIMULATED EMAIL DISPATCH] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
        return { messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` };
      }
    };
  }

  return transporter;
}

/**
 * Sends invitation emails to student roster and a summary receipt to faculty.
 * Supports Google Apps Script Webhook (GOOGLE_SCRIPT_URL) or Nodemailer SMTP.
 */
async function sendBulkQuizInvites({ roster, quiz, facultyEmail, frontendUrl }) {
  const mailer = await getTransporter();
  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const results = { 
    sent: 0, 
    failed: 0, 
    method: googleScriptUrl ? 'google_script' : (mailer.isSimulated ? 'simulated' : 'smtp') 
  };
  const baseUrl = (frontendUrl || 'https://datquiz-88e31.web.app').replace(/\/$/, '');

  if (!roster || roster.length === 0) {
    return results;
  }

  for (const student of roster) {
    const studentEmail = (student.email || student.Email || (student.regNo ? `${student.regNo.toLowerCase()}@student.edu` : '')).trim();

    if (!studentEmail) {
      results.failed++;
      continue;
    }

    const joinLink = `${baseUrl}/#/join?code=${encodeURIComponent(quiz.quizCode)}&reg=${encodeURIComponent(student.regNo || '')}&name=${encodeURIComponent(student.name || '')}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
          <h1 style="color: #ea580c; font-size: 22px; margin: 0; font-weight: 800;">⚡ DatQuiz</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600;">Online Assessment Invitation</p>
        </div>

        <div>
          <h2 style="color: #0f172a; font-size: 16px; margin-top: 0;">Hello, ${student.name || 'Student'}!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">
            You have been registered for the online assessment: <strong>${quiz.title}</strong>.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
            <tr>
              <td style="padding: 10px; color: #64748b; font-weight: bold; font-size: 13px;">Quiz Code:</td>
              <td style="padding: 10px; color: #ea580c; font-weight: bold; font-size: 16px;">${quiz.quizCode}</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #64748b; font-weight: bold; font-size: 13px;">Reg No:</td>
              <td style="padding: 10px; color: #0f172a; font-weight: bold; font-size: 13px;">${student.regNo || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #64748b; font-weight: bold; font-size: 13px;">Duration:</td>
              <td style="padding: 10px; color: #0f172a; font-weight: bold; font-size: 13px;">${quiz.durationMinutes || 30} Mins</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0 12px 0;">
            <a href="${joinLink}" style="background-color: #ea580c; color: #ffffff; padding: 12px 28px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 10px; display: inline-block;">
              Join Quiz &rarr;
            </a>
          </div>
        </div>
      </div>
    `;

    // 1. Google Apps Script Webhook Email Dispatch (if GOOGLE_SCRIPT_URL is configured)
    if (googleScriptUrl) {
      try {
        await fetch(googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: studentEmail,
            subject: `[DatQuiz] Join Quiz: ${quiz.title} (${quiz.quizCode})`,
            html: htmlContent
          })
        });
        results.sent++;
        continue;
      } catch (gErr) {
        console.error(`Google Apps Script dispatch error for ${studentEmail}:`, gErr.message);
      }
    }

    // 2. Nodemailer SMTP or Simulation Dispatch
    try {
      await mailer.sendMail({
        from: '"DatQuiz" <no-reply@datquiz.edu>',
        to: studentEmail,
        subject: `[DatQuiz] Join Quiz: ${quiz.title} (${quiz.quizCode})`,
        html: htmlContent
      });
      results.sent++;
    } catch (err) {
      console.error(`Error sending email to ${studentEmail}:`, err.message);
      results.failed++;
    }
  }

  return results;
}

module.exports = {
  sendBulkQuizInvites
};
