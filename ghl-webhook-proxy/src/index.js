const TRIGGER_API = 'https://api.trigger.dev/api/v1/tasks';
const TRIGGER_TOKEN = 'tr_dev_dszi3Lhg3vYQwOpgTd4j';

const SLACK_AD_ENGINE_CHANNEL = 'C0ALRCDKP3M';

const TASK_MAP = {
  '/wf01': 'wf01-client-onboarding',
  '/wf04': 'wf04-review-request-nps',
  '/wf06': 'wf06-photo-upload-handler',
  '/wf09': 'wf09-onboarding-completion',
  '/wf10': 'wf10-payment-failure-handler',
  '/wf11': 'wf11-sales-quick-audit',
  '/wf25': 'wf25-batch-review-webhook',
  '/wf12': 'wf12-pre-call-pipeline',
  '/slack-events': 'ad-engine-slack-event-handler',
};

async function triggerTask(taskId, payload) {
  const triggerUrl = `${TRIGGER_API}/${taskId}/trigger`;

  const triggerResponse = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TRIGGER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payload }),
  });

  const responseBody = await triggerResponse.text();

  return new Response(responseBody, {
    status: triggerResponse.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleSlackEvents(body) {
  // Handle Slack url_verification challenge
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  // Only process event_callback type
  if (body.type !== 'event_callback') {
    return Response.json({ ok: true });
  }

  const event = body.event;

  // Only handle reaction_added events from the ad engine channel
  if (
    event?.type !== 'reaction_added' ||
    event?.item?.channel !== SLACK_AD_ENGINE_CHANNEL
  ) {
    return Response.json({ ok: true });
  }

  // Trigger the Slack event handler task
  const taskId = TASK_MAP['/slack-events'];
  const triggerResponse = await triggerTask(taskId, { event });

  // Slack expects a 200 within 3 seconds — always acknowledge
  return Response.json({ ok: true });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        routes: Object.keys(TASK_MAP),
      });
    }

    // Slack events route — special handling for challenge + filtering
    if (url.pathname === '/slack-events') {
      if (request.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      return handleSlackEvents(body);
    }

    const taskId = TASK_MAP[url.pathname];
    if (!taskId) {
      return Response.json(
        { error: 'Unknown route', path: url.pathname, available: Object.keys(TASK_MAP) },
        { status: 404 }
      );
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    return triggerTask(taskId, body);
  },
};
