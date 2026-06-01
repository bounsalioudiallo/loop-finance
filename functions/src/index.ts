import { onRequest } from 'firebase-functions/v2/https';

export const health = onRequest((_, response) => {
  response.json({
    ok: true,
    service: 'loop-finance-functions',
  });
});
