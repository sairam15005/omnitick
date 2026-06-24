import type { Request, Response } from 'express';

let handler: any;

try {
  const serverModule = await import('../server.js');
  handler = serverModule.default;
} catch (err: any) {
  console.error('[Vercel Serverless] FATAL: Failed to load server module:', err);
  handler = (_req: Request, res: Response) => {
    res.status(500).json({
      error: 'Server module failed to load',
      message: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined
    });
  };
}

export default handler;
