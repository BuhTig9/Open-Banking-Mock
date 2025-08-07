import buildServer from './index.js';

/** Entry point for starting the mock API when invoked via npm scripts. */
buildServer().then(app => {
  const port = Number(process.env.PORT) || 3000;
  app.listen({ port, host: '0.0.0.0' }, err => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`Open banking mock API listening on http://localhost:${port}`);
  });
});