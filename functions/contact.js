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

  if (!env.RESEND_API_KEY) {
    return json({ error: 'Email service is not configured.' }, 500);
  }

  const html = `
    <table style="font-family:sans-serif;font-size:15px;color:#1f1410;max-width:600px">
      <tr><td style="padding:0 0 8px"><strong>Name:</strong> ${esc(fname)} ${esc(lname)}</td></tr>
      <tr><td style="padding:0 0 8px"><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
      ${org    ? `<tr><td style="padding:0 0 8px"><strong>Organization:</strong> ${esc(org)}</td></tr>` : ''}
      ${subject ? `<tr><td style="padding:0 0 8px"><strong>Area of Interest:</strong> ${esc(subject)}</td></tr>` : ''}
      <tr><td style="padding:16px 0 0;border-top:1px solid #e4e2dd">
        <strong>Message:</strong><br/><br/>
        ${esc(message).replace(/\n/g, '<br/>')}
      </td></tr>
    </table>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Manifold Oncology Website <website@manifoldoncology.com>',
      to:   'contact@manifoldoncology.com',
      reply_to: email,
      subject: `Inquiry — ${subject || 'General'} from ${fname} ${lname}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Resend error:', err);
    return json({ error: 'Failed to send message. Please try again.' }, 500);
  }

  return json({ success: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
