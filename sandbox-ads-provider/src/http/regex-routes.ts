import type { Request, Response, Router } from "express";

type Handler = (req: Request, res: Response, ...params: string[]) => Promise<unknown>;

/**
 * Registers a route whose path is a regular expression. Google-style custom methods
 * ("campaigns:mutate", "versions/3:publish") contain colons that Express path patterns
 * would read as parameters. Captured groups are passed to the handler; a returned value is
 * sent as JSON.
 */
export function route(router: Router, method: "get" | "post" | "put" | "delete", path: RegExp, handler: Handler) {
  router[method](path, async (req, res) => {
    const params = Object.keys(req.params)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => (req.params as Record<string, string>)[key]!);
    const result = await handler(req, res, ...params);
    if (result === undefined) {
      if (!res.headersSent) res.status(204).end();
      return;
    }
    res.json(result);
  });
}
