const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };

  let clientDetails = {};
  try {
    clientDetails = JSON.parse(event.body || '{}');
  } catch (error) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const headers = event.headers || {};
  const forwardedFor = headers['x-forwarded-for'] || '';
  const ipAddress = headers['x-nf-client-connection-ip'] || forwardedFor.split(',')[0].trim() || null;
  const { error } = await sb.from('security_access_logs').insert({
    visit_id: typeof clientDetails.visit_id === 'string' ? clientDetails.visit_id.slice(0, 100) : null,
    event_type: typeof clientDetails.event_type === 'string' ? clientDetails.event_type.slice(0, 50) : 'page_load',
    path: typeof clientDetails.path === 'string' ? clientDetails.path.slice(0, 500) : '/',
    referrer: headers.referer || headers.referrer || null,
    ip_address: ipAddress,
    user_agent: headers['user-agent'] || null,
    country: headers['x-country'] || null,
    region: headers['x-region'] || null,
    city: headers['x-city'] || null,
    client_details: {
      language: typeof clientDetails.language === 'string' ? clientDetails.language.slice(0, 100) : null,
      timezone: typeof clientDetails.timezone === 'string' ? clientDetails.timezone.slice(0, 100) : null,
      screen: typeof clientDetails.screen === 'string' ? clientDetails.screen.slice(0, 50) : null
    }
  });

  if (error) {
    console.error('security access log failed:', error.message);
    return { statusCode: 500, body: 'Could not save access log' };
  }

  return { statusCode: 204, body: '' };
};