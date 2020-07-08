import {
  SidetreeConfig,
  SidetreeCore,
  SidetreeResponse,
  SidetreeResponseModel
} from '@decentralized-identity/sidetree';
import { ProtocolVersionModel } from '@decentralized-identity/sidetree/dist/lib/core/VersionManager';
import * as Koa from 'koa';
import * as getRawBody from 'raw-body';
import * as Router from 'koa-router';

/** Configures your tyronZIL-js client to initialize the Sidetree Core service */
interface tyronZILConfig extends SidetreeConfig {
  port: number;
}

// Default configuration file:
let configFilePath = '../json/config-core-testnet.json';

/** Selects default configuration file (config-core-testnet.json) */
const config: tyronZILConfig = require(configFilePath);

// Default protocol versioning file:
let versioningConfigFilePath = '../json/versioning-core-testnet.json';

/** Selects default protocol versioning file (versioning-core-testnet.json) */
const protocolVersions: ProtocolVersionModel[] = require(versioningConfigFilePath);

/** Creates an instance of the Sidetree Core service */
const sidetreeCore = new SidetreeCore(config, protocolVersions);

/** Creates a Koa application */
const app = new Koa();

// Raw body parser
app.use(async (ctx, next) => {
  ctx.body = await getRawBody(ctx.req);
  await next();
});

/** Creates a Koa-router */
const router = new Router();

// Version request
router.get('/version', async (ctx, _next) => {
  const response = await sidetreeCore.handleGetVersionRequest();
  setKoaResponse(response, ctx.response);
});

// DID operation requests
router.post('/operations', async (ctx, _next) => {
  const response = await sidetreeCore.handleOperationRequest(ctx.body);
  setKoaResponse(response, ctx.response);
});

// DID resolver
const resolvePath = '/identifiers/';
router.get(`${resolvePath}:did`, async (ctx, _next) => {
  // Remove '/identifiers/' from the URL
  const didOrDidDocument = ctx.url.split(resolvePath)[1];
  const response = await sidetreeCore.handleResolveRequest(didOrDidDocument);
  setKoaResponse(response, ctx.response);
});

app.use(router.routes())
   .use(router.allowedMethods());

// Responds with 400 BadRequest for all unhandled paths
app.use((ctx, _next) => {
  ctx.response.status = 400;
});

sidetreeCore.initialize()
.then(() => {
  const port = config.port;
  app.listen(port, () => {
    console.log(`The tyronZIL Sidetree service is running on port: ${port}`);
  });
})
.catch((error: Error) => {
  console.log(`Sidetree service initialization failed with error ${error}`);
  process.exit(1)
});

/** Sets a Koa response according to the Sidetree Response Model interface {status: ResponseStatus; body?: any} */
const setKoaResponse = (response: SidetreeResponseModel, koaResponse: Koa.Response) => {
  
  // Sets the koaResponse status equal to an HTTP status
  // depending on the ResponseStatus enum:
    // BadRequest => 400
    // NotFound => 404
    // ServerError => 500 (default)
    // Succeeded => 200 
  koaResponse.status = SidetreeResponse.toHttpStatus(response.status);
  
  if (response.body) {
    koaResponse.set('Content-Type', 'application/did+json');
    koaResponse.body = response.body;
  } else {
    // Sets the body explicitly to empty string (or Koa will echo the request as the response)
    koaResponse.body = '';
  }
};
