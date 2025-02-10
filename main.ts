import { serve } from "https://deno.land/std/http/server.ts";
import { join } from "https://deno.land/std/path/mod.ts";

const server = serve({ port: 8000 });
console.log("Server running on http://localhost:8000");

for await (const req of server) {
  const url = req.url;
  if (url === "/") {
    const indexHtml = await Deno.readTextFile(join(Deno.cwd(), "index.html"));
    req.respond({ body: indexHtml });
  } else if (url === "/bezierCalculator.js") {
    const jsFile = await Deno.readTextFile(join(Deno.cwd(), "bezierCalculator.js"));
    req.respond({ body: jsFile, headers: { "Content-Type": "application/javascript" } });
  } else {
    req.respond({ status: 404, body: "Not Found" });
  }
}
