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
import * as fs from 'fs';
import Util from './util';
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import SmartUtil from '../lib/smart-util';

/** Address of the init.tyron smart contract
 * @TODO: configure globally
 */
export enum InitTyron {
    Testnet = "0x25a7bb9d8b2a82ba073a3ceb3b24b04fb0a39260",
    Mainnet = "",
    Isolated = ""
}

export const admin_zil_secret_key = '8cefad33c6b2eafe6456e80cd69fda3fcd23b5c4a6719275340f340a9259c26a';

/** Handle the tyronzil command-line interface */
export default class tyronzilCLI {

    /** Get network choice from the user */
    public static async network(): Promise<{ network: tyron.DidScheme.NetworkNamespace, initTyron: InitTyron }> {
        const choice = readline.question(LogColors.green(`On which Zilliqa network would you like to operate, mainnet(m), testnet(t) or isolated server(i)?`) + ` [m/t/i] - Defaults to testnet. ` + LogColors.lightBlue(`Your answer: `));
        let network;
        let init_tyron;
        switch(choice.toLowerCase()) {
            case 'm':
                network = tyron.DidScheme.NetworkNamespace.Mainnet;
                init_tyron = InitTyron.Mainnet;
                break;
            case 'i':
                network = tyron.DidScheme.NetworkNamespace.Isolated;
                init_tyron = InitTyron.Isolated;
                break;
            default:
                // Defaults to testnet
                network = tyron.DidScheme.NetworkNamespace.Testnet;
                init_tyron = InitTyron.Testnet;
                break;
        }
        return {
            network: network,
            initTyron: init_tyron
        }
    }

    /** Saves the `DID Document` in local storage */
    public static async write(did: string, input: tyron.DidDocument.default|tyron.DidDocument.ResolutionResult): Promise<void> {
        try {
            const PRINT_STATE = JSON.stringify(input, null, 2);
            let FILE_NAME;
            if(input instanceof tyron.DidDocument.default) {
                FILE_NAME = `DID_DOCUMENT_${did}.json`;        
            } else {
                FILE_NAME = `DID_RESOLVED_${did}.json`;
            }
            fs.writeFileSync(FILE_NAME, PRINT_STATE);
            console.info(LogColors.yellow(`DID resolved as: ${LogColors.brightYellow(FILE_NAME)}`));
        } catch (error) {
            throw new tyron.ErrorCode.default("CodeCouldNotSave", "The DID file did not get saved");            
        }
    }

    public static async fetchAddr(set_network: { network: tyron.DidScheme.NetworkNamespace, initTyron: InitTyron }): Promise<string> {
        const userDomain = readline.question(LogColors.green(`What is the domain name?`) + ` [e.g. uriel.did] ` + LogColors.lightBlue(`Your answer: `));
        const resolve = userDomain.split(".");
        const addr = await tyron.Resolver.default.resolveDns(set_network.network, set_network.initTyron, resolve[0], resolve[1]);
        return addr        
    }

    /** Handle the deployment of DIDxWallets, NFT Coops and init.tyron smart contracts */
    public static async handleDeploy(): Promise<void> {
        await this.network()
        .then( async set_network => {
            const init = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                50000,
                set_network.initTyron
            );
            const tyron_ = readline.question(LogColors.green(`What tyron smart contract would you like to deploy?`)+` [init, coop, xwallet] ` + LogColors.lightBlue(`Your answer: `));
            const version = readline.question(LogColors.green(`What version of the smart contract would you like to deploy?`)+` [number] ` + LogColors.lightBlue(`Your answer: `));
            const contract_code = await SmartUtil.decode(init, set_network.initTyron, tyron_, version);
            
            // Deploy smart contract
            console.log(LogColors.yellow(`Deploying...`));
            const deployed_contract = await tyron.TyronZil.default.deploy(init, contract_code);
            const addr = deployed_contract.contract.address!;
            console.log(LogColors.green(`The smart contract's address is: `) + LogColors.brightGreen(addr));
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    /** Handle the `DID Create` operation */
    public static async handleDidCreate(): Promise<void> {
        await this.network()
        .then( async set_network => {
            const addr = await this.fetchAddr(set_network);
    
            const init = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                50000,
                set_network.initTyron
            );
        
            // Add verification-method inputs & services:
            const key_input = await Util.InputKeys();
            const services = await Util.services();
            const input: tyron.DidCrud.InputModel = {
                addr: addr,
                publicKeyInput: key_input,
                services: services
            };

            /** Execute the `DID Create` operation */
            const operation = await tyron.DidCrud.default.Create(input);
            const tag = tyron.TyronZil.TransitionTag.Create;
            if(operation !== undefined){ console.log(LogColors.yellow(`Your ${tag} request got processed!`));
            } else{ throw new tyron.ErrorCode.default("RequestUnsuccessful", "Wrong choice. Try again.") }

            await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.Create, init, addr, "0", operation.txParams);
            
            const did = await tyron.DidScheme.default.newDID({network: set_network.network, didUniqueSuffix: addr});
            console.log(LogColors.green(`The decentralized identifier is: `) + LogColors.brightGreen(did.did));

            // To save the private keys:
            await Util.savePrivateKeys(did.did, operation.privateKeys!);
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    /** Resolve a DID and save it */
    public static async handleDidResolve(): Promise<void> {
        try {
            await this.network()
            .then( async set_network => {
                const addr = await this.fetchAddr(set_network);
        
                /** Whether to resolve the DID as a document or resolution result */
                const RESOLUTION_CHOICE = readline.question(LogColors.green(`Would you like to resolve your DID as a document(1) or as a resolution result(2)? `) + ` [1/2] - Defaults to document.` + LogColors.lightBlue(`Your answer: `));
                
                let ACCEPT;
                switch (RESOLUTION_CHOICE) {
                    case "1":
                        ACCEPT = tyron.DidDocument.Accept.contentType                
                        break;
                    case "2":
                        ACCEPT = tyron.DidDocument.Accept.Result
                        break;
                    default:
                        ACCEPT = tyron.DidDocument.Accept.contentType
                        break;
                }

                const resolution_input: tyron.DidDocument.ResolutionInput = {
                    addr: addr,
                    metadata : {
                        accept: ACCEPT
                    }
                }
                console.log(LogColors.brightGreen(`Resolving your request...`));

                /** Resolves the Tyron DID */        
                await tyron.DidDocument.default.resolution(set_network.network, resolution_input)
                .then(async (did_resolved: { id: any; }) => {
                    // Saves the DID Document
                    const DID = did_resolved.id;
                    await this.write(DID, did_resolved);
                })
                .catch((err: any) => { throw err })
            })
        } catch (err) { console.error(LogColors.red(err)) } 
    }

    /** Handle the `DID Recover` operation */
    public static async handleDidRecover(): Promise<void> {
        await this.network()
        .then( async set_network => {
            const addr = await this.fetchAddr(set_network);
            const did_state = await tyron.DidState.default.fetch(set_network.network, addr);
            
            const recovery_private_key = readline.question(LogColors.brightGreen(`DID State retrieved!`) + LogColors.green(` - Provide the recovery private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(recovery_private_key, did_state.did_recovery_key);
            
            // Adds verification-method inputs & services:
            const key_input = await Util.InputKeys();
            const services = await Util.services();

            const input: tyron.DidCrud.InputModel = {
                addr: addr,
                publicKeyInput: key_input,
                services: services,
                recoveryPrivateKey: recovery_private_key
            };

            const operation = await tyron.DidCrud.default.Recover(input);
            const tag = tyron.TyronZil.TransitionTag.Recover;
            if(operation !== undefined) {
                console.log(LogColors.yellow(`Your ${tag} request got processed!`));
            } else {
                throw new tyron.ErrorCode.default("RequestUnsuccessful", "Wrong choice. Try again.")
            }

            console.log(LogColors.yellow(`Executing tyronzil...`));
            const initialized = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                10000,
                set_network.initTyron
            );
            await tyron.TyronZil.default.submit(tag, initialized, addr, "0", operation.txParams);
            
            await Util.savePrivateKeys(did_state.did, operation.privateKeys!);

        })
        .catch((err: unknown) => console.error(LogColors.red(err)))
    }

    /** Handle the `DID Update` operation */
    public static async handleDidUpdate(): Promise<void> {
        await this.network()
        .then( async set_network => {
            const addr = await this.fetchAddr(set_network);
            const did_state = await tyron.DidState.default.fetch(set_network.network, addr);
               
            const update_private_key = readline.question(LogColors.brightGreen(`DID State retrieved!`) + LogColors.green(` - Provide the update private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(update_private_key, did_state.did_update_key);
            
            const patches_amount = readline.question(LogColors.green(`How many patches would you like to make? - `) + LogColors.lightBlue(`Your answer: `));
            const PATCHES = [];
            for(let i=0, t= Number(patches_amount); i<t; ++i) {
                // Asks for the specific patch action to update the DID:
                const action = readline.question(LogColors.green(`You may choose one of the following actions to update the DID:
                'add-keys'(1) - if the key id already exists, then its value will get updated;
                'remove-keys'(2);
                'add-services'(3) - if the service id already exists, then its value will get updated;
                'remove-services'(4)`)
                + ` - [1/2/3/4] - ` + LogColors.lightBlue(`Your answer: `));
                
                let key_input;
                let services;
                const id = []
                let patch_action;
                switch (action) {
                    case '1':
                        patch_action = tyron.DocumentModel.PatchAction.AddKeys;
                        key_input = await Util.InputKeys();
                        break;
                    case '2':
                        patch_action = tyron.DocumentModel.PatchAction.RemoveKeys;
                        const amount = readline.question(LogColors.green(`How many keys would you like to remove? - `) + LogColors.lightBlue(`Your answer: `));
                            for(let i=0, t= Number(amount); i<t; ++i) {
                                const key_id = readline.question(LogColors.green(`Next, provide the ID of the key that you would like to remove - `) + LogColors.lightBlue(`Your answer: `));
                                id.push(key_id)
                            }
                        break;
                    case '3':
                        patch_action = tyron.DocumentModel.PatchAction.AddServices;
                        services = await Util.services();
                        break;
                    case '4':
                        patch_action = tyron.DocumentModel.PatchAction.RemoveServices;
                        {
                            const amount = readline.question(LogColors.green(`How many services would you like to remove? - `) + LogColors.lightBlue(`Your answer: `));
                            for(let i=0, t= Number(amount); i<t; ++i) {
                                const service_id = readline.question(LogColors.green(`Next, provide the ID of the service that you would like to remove - `) + LogColors.lightBlue(`Your answer: `));
                                id.push(service_id)
                            }
                        }
                        break;
                    default:
                        throw new tyron.ErrorCode.default("CodeIncorrectPatchAction", "The chosen action is not valid");
                }
            
                const patch: tyron.DocumentModel.PatchModel = {
                    action: patch_action,
                    keyInput: key_input,
                    services: services,
                    ids: id
                }
                PATCHES.push(patch)
            }            
            const update_input: tyron.DidCrud.UpdateInputModel = {
                addr: addr,
                state: did_state,
                updatePrivateKey: update_private_key,
                patches: PATCHES            
            };

            const operation = await tyron.DidCrud.default.Update(update_input);
            const tag = tyron.TyronZil.TransitionTag.Update;
            if(operation !== undefined) {
                console.log(LogColors.yellow(`The ${tag} request got processed!`));
            } else {
                throw new tyron.ErrorCode.default("RequestUnsuccessful", "Wrong choice. Try again.")
            }
            
            console.log(LogColors.yellow(`Executing tyronzil...`));
            const initialized = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                10000,
                set_network.initTyron
            );
            await tyron.TyronZil.default.submit(tag, initialized, addr, "0", operation.txParams);
            
            // To save the private keys:
            await Util.savePrivateKeys(did_state.did, operation.privateKeys!)
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))
    }

    /** Handle the `DID Deactivate` operation */
    public static async handleDidDeactivate(): Promise<void> {
        await this.network()
        .then( async set_network => {
            const addr = await this.fetchAddr(set_network);
            const did_state = await tyron.DidState.default.fetch(set_network.network, addr);

            const recovery_private_key = readline.question(LogColors.brightGreen(`DID State retrieved!`) + LogColors.green(` - Provide the recovery private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(recovery_private_key, did_state.did_recovery_key);
            
            const input = {
                addr: addr,
                state: did_state,
                recoveryPrivateKey: recovery_private_key
            };

            const operation = await tyron.DidCrud.default.Deactivate(input);
            const tag = tyron.TyronZil.TransitionTag.Deactivate;
            if(operation !== undefined) {
                console.log(LogColors.yellow(`Your ${tag} request got processed!`));
            } else {
                throw new tyron.ErrorCode.default("RequestUnsuccessful", "Wrong choice. Try again.")
            }
            
            console.log(LogColors.yellow(`Executing tyronzil...`));
            const initialized = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                10000,
                set_network.initTyron
            );
            const tx = await tyron.TyronZil.default.submit(tyron.TyronZil.TransitionTag.Deactivate, initialized, addr, "0", operation.txParams);
            console.log(JSON.stringify(tx, null, 2));
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))
    }
}