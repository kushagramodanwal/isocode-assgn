import { env } from "./env";
import { createApp } from "./app";

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}${env.isProd ? " (serving dist/web)" : ""}`);
});
