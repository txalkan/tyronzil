#!/usr/bin/env node
// So `npm i` installs the CLI correctly across all operating systems

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

import * as yargs from 'yargs';
import tyronCLI from './tyronZIL-CLI';

yargs
  .scriptName('tyronzil')
  .usage('Usage: $0 <command> [options]')
  .demandCommand(1, 'Try: tyronzil <command>, with command= did')
  .command('did', '(to execute a tyronZIL DID-operation, try: $tyronzil did <subcommand>, with subcommand= create|resolve|update|recover|deactivate)', (yargs) => {
    yargs
      .usage('Usage: $0 did <subcommand> [options]')
      .demandCommand(1, 'Specify a subcommand: create|resolve|update|recover|deactivate')
      .command('create', '(creates a unique digital identity did:tyron:zil)', async () => {
        await tyronCLI.handleCreate();
      })
  })
  .strict() // the command must be one of the explicitly defined commands
  .help(false)    // disabling --help option
  .version(false) // disabling --version option
  .argv;
