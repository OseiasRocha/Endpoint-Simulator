import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import openApiSpec from '../docs/openapi';

const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.status(200).json(openApiSpec);
});

docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: 'EndpointLab API Docs',
  }),
);

export default docsRouter;
