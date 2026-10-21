import { AppModule } from './app.module.js';
import { createApiApplication } from './bootstrap.js';

const app = await createApiApplication(AppModule);
const port = Number(process.env.PORT_API ?? 3001);
await app.listen(port, '0.0.0.0');
process.stdout.write(`AlertaSC API listening on port ${port}.\n`);
