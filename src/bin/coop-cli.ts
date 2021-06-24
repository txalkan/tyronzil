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
GNU General Public License for more details.*/

import * as tyron from 'tyron'
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import tyronzilCLI, { admin_zil_secret_key } from './tyronzil-cli';

/** Handle the tyronzil command-line interface */
export default class coopCLI {

    public static async handleAddWork(): Promise<void> {
        const set_network = await tyronzilCLI.network();
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const userDomain = readline.question(LogColors.green(`What is the domain name of the coop?`) + ` [e.g. tyron.coop] ` + LogColors.lightBlue(`Your answer: `));
            const resolve = userDomain.split(".");
            const addr = await tyron.Resolver.default.resolveDns(set_network.network, set_network.initTyron, resolve[0], resolve[1])
            
            const tprotocol = readline.question(LogColors.green(`What's the transfer protocol?`)+ ' [https: 1/ git: 2] '+ LogColors.lightBlue(`Your answer: `));
            let tprotocol_: tyron.DocumentModel.TransferProtocol;
            switch (tprotocol) {
                case "1":
                    tprotocol_ = tyron.DocumentModel.TransferProtocol.Https                    
                    break;
                case "2":
                    tprotocol_ = tyron.DocumentModel.TransferProtocol.Git                 
                    break;
            }
            const uri = readline.question(LogColors.green(`What's the PR's URI?`)+ ' [www.github.com/...] '+ LogColors.lightBlue(`Your answer: `));
            const amount = readline.question(LogColors.green(`How many hours did you work on it?`)+ ' [number] '+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.AddWork(addr, tprotocol_!, uri, amount);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.AddWork, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleNFTTransfer(): Promise<void> {
        const set_network = await tyronzilCLI.network();
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const userDomain = readline.question(LogColors.green(`What is the domain name?`) + ` [e.g. uriel.did] ` + LogColors.lightBlue(`Your answer: `));
            const resolve = userDomain.split(".");
            const addr = await tyron.Resolver.default.resolveDns(set_network.network, set_network.initTyron, resolve[0], resolve[1])
            
            const beneficiary = readline.question(LogColors.green(`What's the domain name of the beneficiary? `)+ LogColors.lightBlue(`Your answer: `));
            const resolve_ = beneficiary.split(".");
            const beneficiary_: tyron.TyronZil.Beneficiary = {
                username: resolve_[0],
                domain: resolve_[1],
                constructor: tyron.TyronZil.BeneficiaryConstructor.domain
            };
            
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.NFTTransfer(addr, beneficiary_);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.NFTTransfer, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }
}