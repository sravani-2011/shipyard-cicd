const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const startedAt = new Date();

const buildInfo = {
  version: process.env.APP_VERSION || 'dev',
  buildNumber: process.env.BUILD_NUMBER || 'local',
  gitCommit: process.env.GIT_COMMIT || 'unknown',
  image: process.env.IMAGE || 'local-build',
};

let requestCount = 0;
app.use((req, res, next) => { requestCount++; next(); });
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Liveness / readiness probes for Kubernetes
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (req, res) => res.json({ status: 'ready' }));

// Runtime information shown on the Status page
app.get('/api/info', (req, res) => {
  res.json({
    ...buildInfo,
    pod: process.env.POD_NAME || os.hostname(),
    namespace: process.env.POD_NAMESPACE || 'n/a',
    node: process.env.NODE_NAME || 'n/a',
    podIP: process.env.POD_IP || 'n/a',
    nodeVersion: process.version,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    startedAt: startedAt.toISOString(),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    requests: requestCount,
  });
});

// Contact form endpoint (stores nothing; demo of a POST API)
app.post('/api/contact', express.json(), (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'All fields are required.' });
  }
  res.json({ ok: true, receivedBy: os.hostname() });
});

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Shipyard running on port ${PORT}`));
}

module.exports = app;
