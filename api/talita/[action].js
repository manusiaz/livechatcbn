// Vercel Function: /api/talita/{session,message,lead,event}
const { createApi } = require('../../lib/talita');

const api = createApi();

module.exports = async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = null; } }
  return api.handle(String(req.query.action || ''), req, res, body || (req.method === 'POST' ? null : {}));
};
