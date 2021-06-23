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

import * as tyron from 'tyron';
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import tyronzilCLI, { admin_zil_secret_key } from './tyronzil-cli';

/** Handle the xWallet command-line interface */
export default class xWalletCLI {

    public static async handleBuyDomainNameNFT(): Promise<void> {
        const set_network = tyronzilCLI.network();
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const username = readline.question(LogColors.green(`What's the username NFT that you'd like to buy? `)+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.BuyDomainNameNFT(username);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.BuyDomainNameNFT, init, addr, "200000000000000", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleTransferDomainNameNFT(): Promise<void> {
        const set_network = tyronzilCLI.network();
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const username = readline.question(LogColors.green(`What's the username NFT that you'd like to buy? `)+ LogColors.lightBlue(`Your answer: `));
            const addr1 = readline.question(LogColors.green(`What's the new address?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.TransferDomainNameNFT(username, addr1);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.TransferDomainNameNFT, init, addr, "110000000000000", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }
    
    public static async handleEnableSocialRecovery(): Promise<void> {
        const set_network = tyronzilCLI.network();
        const owner_zil_secret_key = readline.question(LogColors.green(`What is the user's Zilliqa secret key?`) + ` [Hex-encoded private key] ` + LogColors.lightBlue(`Your answer: `));
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            owner_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const addr1 = readline.question(LogColors.green(`What's the address of the first recoverer?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const addr2 = readline.question(LogColors.green(`What's the address of the second recoverer?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.EnableSocialRecovery(addr1, addr2);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.EnableSocialRecovery, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleUpdateSocialRecoverer(): Promise<void> {
        const set_network = tyronzilCLI.network();
        const owner_zil_secret_key = readline.question(LogColors.green(`What is the user's Zilliqa secret key?`) + ` [Hex-encoded private key] ` + LogColors.lightBlue(`Your answer: `));
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            owner_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const recoverer = readline.question(LogColors.green(`What's the recoverer you'd like to update?`)+ ` [1/2] `+ LogColors.lightBlue(`Your answer: `));
            const addr1 = readline.question(LogColors.green(`What's the new address?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            let recoverer_: tyron.TyronZil.Recoverer;
            switch (recoverer) {
                case '1':
                    recoverer_ = tyron.TyronZil.Recoverer.first
                    break;
                case '2':
                    recoverer_ = tyron.TyronZil.Recoverer.second
                    break;
            }
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.UpdateSocialRecoverer(addr, recoverer_!, addr1)
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.UpdateSocialRecoverer, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleUpdateInit(): Promise<void> {
        const set_network = tyronzilCLI.network();
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const addr1 = readline.question(LogColors.green(`What's the new address of init.tyron?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.TxAddr(addr1);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.UpdateInit, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleUpdateAdmin(): Promise<void> {
        const set_network = tyronzilCLI.network();
        
        console.log(LogColors.yellow(`Initializing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const addr1 = readline.question(LogColors.green(`What's your new admin address?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Submitting transaction...`));
            const tx_params = await tyron.TyronZil.default.TxAddr(addr1);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.UpdateAdmin, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }
}