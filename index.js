const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const { REST_API, TOKEN } = process.env;

function getStatus(build) {
  switch (build.status) {
    case 'FAILED':
      return {
        state: 'error',
        description: 'Build ${build.number} has suffered a system error. Please try again.',
      };

    case 'BROKEN':
      return {
        state: 'failure',
        description: `Build ${build.number} failed to render.`,
      };
    case 'DENIED':
      return {
        state: 'failure',
        description: `Build ${build.number} denied.`,
      };
    case 'PENDING':
      return {
        state: 'pending',
        description: `Build ${build.number} has ${build.changeCount} changes that must be accepted`,
      };
    case 'ACCEPTED':
      return {
        state: 'success',
        description: `Build ${build.number} accepted.`,
      };
    case 'PASSED':
      return {
        state: 'success',
        description: `Build ${build.number} passed unchanged.`,
      };
  }

  return {
    context: 'UI Tests',
  };
}

async function setCommitStatus(build, { repoId, name }) {
  const status = getStatus(build);

  const body = JSON.stringify({
    context: name ? `UI Tests (${name})` : 'UI Tests',
    target_url: build.webUrl,
    ...status,
  });

  console.log(`POSTING to ${REST_API}repositories/${repoId}/statuses/${build.commit}`);

  const result = await fetch(`${REST_API}repositories/${repoId}/statuses/${build.commit}`, {
    method: 'POST',
    body,
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  console.log(result);
  console.log(await result.text());
}

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const { event, build } = req.body;
  const { repoId, name } = req.query;

  if (!repoId) {
    throw new Error('Need a repoId query param on webhook URL');
  }

  if (event === 'build-status-changed') {
    await setCommitStatus(build, { repoId, name });
  }

  res.end('OK');
});

const { PORT = 3000 } = process.env;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
