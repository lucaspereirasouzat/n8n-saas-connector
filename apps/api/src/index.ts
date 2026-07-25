import { app } from "./app.js";
import { env, validateEnvironment } from "./config/env.js";

validateEnvironment();
app.listen(env.port, () =>
  console.info(`Flowly API: http://localhost:${env.port}`),
);
