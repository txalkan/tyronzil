#!/usr/bin/env node
// So `npm i` installs the CLI correctly across all operating systems

/*
    SSI Protocol's client for Node.js
    Self-Sovereign Identity Protocol.
    Copyright (C) Tyron Pungtas and its affiliates.

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
import tyronCLI from './tyronzil-cli';
import SmartUtil from '../lib/smart-util';

yargs
	.scriptName('tyronzil')
  	.usage('Usage: $0 <command> [options]')
  	.demandCommand(1, 'Try: tyronzil <command>, with command = did OR resolve')
	.command('deploy', ' -> deploys a tyron smart contract', async() => {
		await tyronCLI.handleDeploy();
	})
	.command('enablesr', ' -> enable social recovery', async() => {
		await tyronCLI.handleEnableSocialRecovery();
	})
	.command('updatesr', ' -> update social recoverer', async() => {
		await tyronCLI.handleUpdateSocialRecoverer();
	})
	.command('buynft', ' -> buy domain name NFT', async() => {
		await tyronCLI.handleBuyDomainNameNFT();
	})
	.command('updateinit', ' -> update address of init.tyron', async() => {
		await tyronCLI.handleUpdateInit();
	})
	.command('updateadmin', ' -> update address of the admin of the contract', async() => {
		await tyronCLI.handleUpdateAdmin();
	})
	.command('nfttransfer', ' -> transfer NFT coop membership', async() => {
		await tyronCLI.handleNFTTransfer();
	})
	.command('addwork', ' -> add work to NFT coop', async() => {
		await tyronCLI.handleNFTTransfer();
	})
  	.command('did', ' -> to execute a tyronZIL DID operation, try: $tyronzil did <subcommand>, with subcommand = create|resolve|update|recover|deactivate', (yargs) => {
    	yargs
			.usage('Usage: $0 did <subcommand> [options]')
			.demandCommand(1, 'Specify a subcommand: create|resolve|update|recover|deactivate')
			.command('create', ' -> creates a unique digital identity did:tyron:zil)', async() => {
				await tyronCLI.handleDidCreate();
			})
			.command('recover', ' -> recovers the given tyronZIL DID and creates a new DID-state)', async() => {
				await tyronCLI.handleDidRecover();
			})
			.command('update', ' -> updates the given tyronZIL DID and its DID-state', async() => {
				await tyronCLI.handleDidUpdate();
			})
			.command('deactivate', ' -> deactivates the given tyronZIL DID and its DID-state', async() => {
				await tyronCLI.handleDidDeactivate();
			})
			.wrap(null)
			.strict(); //the sub-command must be one of the explicitly defined sub-commands
  	})
	.command('resolve', ' -> resolves the given tyronZIL DID into its DID-document (read operation)', async() => {
		await tyronCLI.handleDidResolve();
	})
	.command('encode', ' -> encodes the given contract into a Base64URL string', async() => {
		await SmartUtil.encode();
	})
	.strict()       // the command must be one of the explicitly defined commands
	.help(false)    // disabling --help option
	.version(false) // disabling --version option
	.argv;
