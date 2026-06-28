import { EmailMessage } from 'cloudflare:email';

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const { fname, lname, email, org, subject, message } = data;

  if (!fname || !lname || !email || !message) {
    return json({ error: 'Please fill in all required fields.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  const from    = 'website@manifoldoncology.com';
  const to      = 'contact@manifoldoncology.com';
  const subjectLine = `Inquiry — ${subject || 'General'} from ${fname} ${lname}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;font-size:15px;color:#1f1410;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="font-size:18px;margin:0 0 20px;border-bottom:2px solid #e26b1a;padding-bottom:10px">
    New Inquiry — Manifold Oncology
  </h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px 0;width:140px;color:#6e1b1b;font-weight:600">Name</td>
        <td style="padding:8px 0">${esc(fname)} ${esc(lname)}</td></tr>
    <tr><td style="padding:8px 0;color:#6e1b1b;font-weight:600">Email</td>
        <td style="padding:8px 0"><a href="mailto:${esc(email)}" style="color:#e26b1a">${esc(email)}</a></td></tr>
    ${org     ? `<tr><td style="padding:8px 0;color:#6e1b1b;font-weight:600">Organization</td>
                     <td style="padding:8px 0">${esc(org)}</td></tr>` : ''}
    ${subject ? `<tr><td style="padding:8px 0;color:#6e1b1b;font-weight:600">Area of Interest</td>
                     <td style="padding:8px 0">${esc(subject)}</td></tr>` : ''}
  </table>
  <div style="margin-top:20px;padding:16px;background:#fffaf2;border-left:3px solid #e26b1a">
    <strong style="color:#6e1b1b">Message</strong><br/><br/>
    ${esc(message).replace(/\n/g, '<br/>')}
  </div>
  <p style="margin-top:20px;font-size:12px;color:#999">
    Sent from manifoldoncology.com contact form · Reply-To: ${esc(email)}
  </p>
</body>
</html>`;

  const raw = [
    `From: Manifold Oncology Website <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${esc(fname)} ${esc(lname)} <${email}>`,
    `Subject: ${subjectLine}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
  ].join('\r\n');

  try {
    const msg = new EmailMessage(from, to, new Response(raw).body);
    await env.EMAIL.send(msg);
    return json({ success: true });
  } catch (err) {
    console.error('Email send error:', err?.message ?? err);
    return json({ error: 'Failed to send message. Please try again.' }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
