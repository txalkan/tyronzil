#!/usr/bin/env node
// So `npm i` installs the CLI correctly across all operating systems

/*
SSI Client for Node.js
Tyron Self-Sovereign Identity Protocol
Copyright (C) Tyron Pungtas and its affiliates.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.*/

import * as yargs from 'yargs';
import tyronzilCLI from './tyronzil-cli';
import SmartUtil from '../lib/smart-util';

import hash from 'hash.js';
import * as zcrypto from '@zilliqa-js/crypto';
import * as zutil from '@zilliqa-js/util';
import xWalletCLI from './xwallet-cli';
import coopCLI from './coop-cli';
import pstCLI from './pst-cli';

yargs
	.scriptName('tyronzil')
  	.usage('Usage: $0 <command> [options]')
  	.demandCommand(1, 'Try: tyronzil <command>, with command = did OR resolve')
	.command('test', ' -> ...', async() => {
		const h1 = hash.sha256().update("hola").digest('hex');
		console.log(h1);
		let hash_ = "0000000000000000000000000000000000000000";
		const key = "020616e2521b9914c2363a51239249bbdc7aeb899bb70f1bf1ab96c8c8a2af4461"
		const h3 = hash.sha256().update(zutil.bytes.hexToByteArray(key)).digest('hex');	
							
		const previous_recovery_key = zcrypto.getPubKeyFromPrivateKey('e4abc6a56291872f880e9582cb2eebfe9ba83895014831d22bfe7213f766ca1a');
		console.log(previous_recovery_key);
		const concat_ = hash_+h1+h3; console.log(concat_);
		const signature = zcrypto.sign(Buffer.from(concat_, 'hex'), 'e4abc6a56291872f880e9582cb2eebfe9ba83895014831d22bfe7213f766ca1a', previous_recovery_key);
		console.log(signature);
		
	})
	.command('deploy', ' -> deploys a tyron smart contract', async() => {
		await tyronzilCLI.handleDeploy();
	})
	.command('addfunds', ' -> add $ZIL to smart contract', async() => {
		await xWalletCLI.handleAddFunds();
	})
	.command('buynft', ' -> buy domain name NFT', async() => {
		await xWalletCLI.handleBuyNFTUsername();
	})
	.command('transfernft', ' -> transfer domain name NFT', async() => {
		await xWalletCLI.handleTransferDomainNameNFT();
	})
	.command('enablesr', ' -> enable social recovery', async() => {
		await xWalletCLI.handleEnableSocialRecovery();
	})
	.command('updatesr', ' -> update social recoverer', async() => {
		await xWalletCLI.handleUpdateSocialRecoverer();
	})

	.command('updateinit', ' -> update address of init.tyron', async() => {
		await xWalletCLI.handleUpdateInit();
	})
	.command('updatecontroller', ' -> update address of the DID controller', async() => {
		await xWalletCLI.handleUpdateController();
	})
	.command('addwork', ' -> add work to NFT coop', async() => {
		await coopCLI.handleAddWork();
	})
	.command('encode', ' -> encodes the given contract into a Base64URL string', async() => {
		await SmartUtil.encode();
	})
	.command('deploypst', ' -> deploys a pst.tyron smart contract', async() => {
		await pstCLI.handleDeploy();
	})
	.strict()       // the command must be one of the explicitly defined commands
	.help(false)    // disabling --help option
	.version(false) // disabling --version option
	.argv;
