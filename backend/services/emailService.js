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

  // Fallback to Instant Simulation Transport if no credentials or connection fails
  if (!transporter) {
    console.log('ℹ️ Real SMTP credentials (EMAIL_USER / EMAIL_PASS) not set in backend env. Using Simulation Dispatch.');
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
 * Sends magic link invitation emails to student roster and a summary receipt to faculty.
 */
async function sendBulkQuizInvites({ roster, quiz, facultyEmail, frontendUrl }) {
  const mailer = await getTransporter();
  const results = { sent: 0, failed: 0, simulated: !!mailer.isSimulated, previewUrls: [] };
  const baseUrl = (frontendUrl || 'https://datquiz-88e31.web.app').replace(/\/$/, '');

  if (!roster || roster.length === 0) {
    return results;
  }

  for (const student of roster) {
    if (!student.email) {
      results.failed++;
      continue;
    }

    const magicLink = `${baseUrl}/#/join?code=${encodeURIComponent(quiz.quizCode)}&reg=${encodeURIComponent(student.regNo || '')}&name=${encodeURIComponent(student.name || '')}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff7ed; padding: 24px; border-radius: 12px; border: 1px solid #ffedd5;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ea580c; font-size: 24px; margin: 0;">⚡ DatQuiz LMS</h1>
          <p style="color: #9a3412; font-size: 14px; margin-top: 4px;">Online Assessment Invitation</p>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h2 style="color: #431407; font-size: 18px; margin-top: 0;">Hello, ${student.name || 'Student'}!</h2>
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
              <td style="padding: 8px; color: #431407;">${student.regNo || 'N/A'}</td>
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
            Direct Link: <a href="${magicLink}" style="color: #ea580c;">${magicLink}</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #9a3412; font-size: 12px;">
          DatQuiz LMS &bull; Automated System Dispatch
        </div>
      </div>
    `;

    try {
      await mailer.sendMail({
        from: '"DatQuiz LMS" <no-reply@datquiz.edu>',
        to: student.email,
        subject: `[DatQuiz] Join Quiz: ${quiz.title} (${quiz.quizCode})`,
        html: htmlContent
      });
      results.sent++;
    } catch (err) {
      console.error(`Error sending email to ${student.email}:`, err.message);
      results.failed++;
    }
  }

  // Send summary email to faculty member if real SMTP configured
  if (facultyEmail && !mailer.isSimulated) {
    try {
      await mailer.sendMail({
        from: '"DatQuiz LMS" <no-reply@datquiz.edu>',
        to: facultyEmail,
        subject: `[Dispatch Summary] Invites Sent for ${quiz.quizCode} - ${quiz.title}`,
        html: `<p>Invites processed: ${results.sent} sent, ${results.failed} failed.</p>`
      });
    } catch (err) {
      console.error('Error sending faculty receipt:', err.message);
    }
  }

  return results;
}

module.exports = {
  sendBulkQuizInvites
};
