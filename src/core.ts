/*
    TyronZIL-js: Decentralized identity client for the Zilliqa blockchain platform
    Copyright (C) 2020 Julio Cesar Cabrapan Duarte

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/

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
const CONFIG_FILE_PATH = '../config/config-core-testnet.json';

/** Selects default configuration file (config-core-testnet.json) */
/* eslint-disable */
const CONFIG: tyronZILConfig = require(CONFIG_FILE_PATH);

// Default protocol versioning file:
const versioningConfigFilePath = '../config/versioning-core-testnet.json';

/** Selects default protocol versioning file (versioning-core-testnet.json) */
/* eslint-disable */
const PROTOCOL_VERSION: ProtocolVersionModel[] = require(versioningConfigFilePath);

/** Creates an instance of the Sidetree Core service */
const SIDETREE_CORE = new SidetreeCore(CONFIG, PROTOCOL_VERSION);

/** Creates a Koa application */
const APP = new Koa();

// Raw body parser
APP.use(async (ctx, next) => {
  ctx.body = await getRawBody(ctx.req);
  await next();
});

/** Creates a Koa-router */
const ROUTER = new Router();

// Version request
ROUTER.get('/version', async (ctx, _next) => {
  const RESPONSE = await SIDETREE_CORE.handleGetVersionRequest();
  setKoaResponse(RESPONSE, ctx.response);
});

// DID operation requests
ROUTER.post('/operations', async (ctx, _next) => {
  const RESPONSE = await SIDETREE_CORE.handleOperationRequest(ctx.body);
  setKoaResponse(RESPONSE, ctx.response);
});

// DID resolver
const RESOLUTION_PATH = '/resolve/';
ROUTER.get(`${RESOLUTION_PATH}:did`, async (ctx, _next) => {
  // Remove '/identifiers/' from the URL
  const didOrDidDocument = ctx.url.split(RESOLUTION_PATH)[1];
  const RESPONSE = await SIDETREE_CORE.handleResolveRequest(didOrDidDocument);
  setKoaResponse(RESPONSE, ctx.response);
});

APP.use(ROUTER.routes())
   .use(ROUTER.allowedMethods());

// Responds with 400 BadRequest for all unhandled paths
APP.use((ctx, _next) => {
  ctx.response.status = 400;
});

SIDETREE_CORE.initialize()
.then(() => {
  const PORT = CONFIG.port;
  APP.listen(PORT, () => {
    console.log(`The tyronZIL Sidetree service is running on port: ${PORT}`);
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
