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
import * as zcrypto from '@zilliqa-js/crypto';

/** Handle the xWallet command-line interface */
export default class xWalletCLI {
    public static async handleBuyDomainNameNFT(): Promise<void> {
        const set_network = await tyronzilCLI.network();
        let addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
        const username = readline.question(LogColors.green(`What's the username NFT that you'd like to buy? `)+ LogColors.lightBlue(`Your answer: `));
        addr = zcrypto.toChecksumAddress(addr);

        console.log(LogColors.yellow(`Executing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const tx_params = await tyron.TyronZil.default.BuyDomainNameNFT(username);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.BuyDomainNameNFT, init, addr, "100000000000000", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleAddFunds(): Promise<void> {
        await tyronzilCLI.network()
        .then( async set_network => {
            const addr = await tyronzilCLI.fetchAddr(set_network);
            const amount = readline.question(LogColors.green(`How much would you like to top up?`) + ` [$ZIL amount] ` + LogColors.lightBlue(`Your answer: `));
        
            console.log(LogColors.yellow(`Executing tyronzil...`));
            const initialized = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                10000,
                set_network.initTyron
            );

            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.AddFunds, initialized, addr, String(Number(amount)*1e12), []);
            console.log(JSON.stringify(tx, null, 2));
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))
    }

    public static async handleTransferDomainNameNFT(): Promise<void> {
        const set_network = await tyronzilCLI.network();
        const addr = await tyronzilCLI.fetchAddr(set_network);
        const username = readline.question(LogColors.green(`What's the username NFT that you'd like to transfer? `)+ LogColors.lightBlue(`Your answer: `));
        let addr1 = readline.question(LogColors.green(`What's the beneficiary address?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
        addr1 = zcrypto.toChecksumAddress(addr1);

        console.log(LogColors.yellow(`Executing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const tx_params = await tyron.TyronZil.default.TransferDomainNameNFT(username, addr1);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.TransferDomainNameNFT, init, addr, "0", tx_params);
            console.log(JSON.stringify(tx, null, 2));
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }
    
    public static async handleEnableSocialRecovery(): Promise<void> {
        await tyronzilCLI.network()
        .then( async set_network => {
            const addr = await tyronzilCLI.fetchAddr(set_network);
            const addr1 = readline.question(LogColors.green(`What's the address of the first recoverer?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const addr2 = readline.question(LogColors.green(`What's the address of the second recoverer?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Executing tyronzil...`));
            const init = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                10000,
                set_network.initTyron
            );
    
            const tx_params = await tyron.TyronZil.default.EnableSocialRecovery(zcrypto.toChecksumAddress(addr1), zcrypto.toChecksumAddress(addr2));
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.EnableSocialRecovery, init, addr, "0", tx_params);
            console.log(JSON.stringify(tx, null, 2));
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleUpdateSocialRecoverer(): Promise<void> {
        await tyronzilCLI.network()
        .then( async set_network => {
            const addr = await tyronzilCLI.fetchAddr(set_network);
            const recoverer = readline.question(LogColors.green(`What's the recoverer you'd like to update?`)+ ` [1/2] `+ LogColors.lightBlue(`Your answer: `));
            const addr1 = readline.question(LogColors.green(`What's the new address?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            console.log(LogColors.yellow(`Executing tyronzil...`));
            const init = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                10000,
                set_network.initTyron
            );
            
            let recoverer_: tyron.TyronZil.Recoverer;
            switch (recoverer) {
                case '1':
                    recoverer_ = tyron.TyronZil.Recoverer.first
                    break;
                case '2':
                    recoverer_ = tyron.TyronZil.Recoverer.second
                    break;
            }
            const tx_params = await tyron.TyronZil.default.UpdateSocialRecoverer(addr, recoverer_!, zcrypto.toChecksumAddress(addr1));
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.UpdateSocialRecoverer, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleUpdateInit(): Promise<void> {
        await tyronzilCLI.network()
        .then( async set_network => {
            const addr = await tyronzilCLI.fetchAddr(set_network);
            let addr1 = readline.question(LogColors.green(`What's the new address of init.tyron?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            addr1 = zcrypto.toChecksumAddress(addr1);

            console.log(LogColors.yellow(`Executing tyronzil...`));
            const init = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                50000,
                set_network.initTyron
            );
        
            
            const tx_params = await tyron.TyronZil.default.TxAddr(addr1);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.UpdateInit, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async handleUpdateAdmin(): Promise<void> {
        const set_network = await tyronzilCLI.network();
        
        console.log(LogColors.yellow(`Executing tyronzil...`));
        await tyron.TyronZil.default.initialize(
            set_network.network,
            admin_zil_secret_key,
            10000,
            set_network.initTyron
        )
        .then(async (init: any) => {
            const addr = readline.question(LogColors.green(`What's the address of your tyron smart contract?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            const addr1 = readline.question(LogColors.green(`What's your new admin address?`)+ ` [Base16 address] `+ LogColors.lightBlue(`Your answer: `));
            
            const tx_params = await tyron.TyronZil.default.TxAddr(addr1);
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.UpdateAdmin, init, addr, "0", tx_params);
            console.log(tx);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }
}