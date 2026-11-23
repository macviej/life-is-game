import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localVercelApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost:5173');
          const routeName = urlObj.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
          if (routeName !== 'auth' && routeName !== 'sync') {
            return next();
          }

          const mod = await server.ssrLoadModule(`/api/${routeName}.ts`);
          const method = (req.method || 'GET').toUpperCase();
          const handler = mod[method];

          if (typeof handler !== 'function') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const rawBody = Buffer.concat(chunks);

          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (Array.isArray(v)) {
              headers.set(k, v.join(', '));
            } else if (typeof v === 'string') {
              headers.set(k, v);
            }
          }

          const webReq = new Request(urlObj.toString(), {
            method,
            headers,
            body: method !== 'GET' && method !== 'HEAD' && rawBody.length > 0 ? rawBody : undefined,
          });

          const webRes: Response = await handler(webReq);
          res.statusCode = webRes.status;
          webRes.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });
          const respText = await webRes.text();
          res.end(respText);
        } catch (err) {
          console.error('Local API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Local API Error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }

  return {
    plugins: [react(), localVercelApiPlugin()],
    server: {
      port: 5173,
      host: true,
    },
  };
});
