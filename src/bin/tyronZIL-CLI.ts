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

import * as zcrypto from '@zilliqa-js/crypto';
import DidCreate from '../lib/decentralized-identity/did-operations/did-create';
import DidUpdate, { UpdateOperationInput } from '../lib/decentralized-identity/did-operations/did-update';
import DidRecover, { RecoverOperationInput } from '../lib/decentralized-identity/did-operations/did-recover';
import DidDeactivate, { DeactivateOperationInput } from '../lib/decentralized-identity/did-operations/did-deactivate';
import Util, { CliInputModel } from './util';
import TyronZIL, { InitTyron, TransitionTag } from '../lib/blockchain/tyronzil';
import DidScheme, { NetworkNamespace } from '../lib/decentralized-identity/tyronZIL-schemes/did-scheme';
import DidState from '../lib/decentralized-identity/did-operations/did-resolve/did-state';
import DidDoc, {ResolutionInput, Accept } from '../lib/decentralized-identity/did-operations/did-resolve/did-document';
import { PatchAction, PatchModel } from '../lib/decentralized-identity/protocols/models/document-model';
import ErrorCode from '../lib/decentralized-identity/util/ErrorCode';
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import Resolver from '../lib/decentralized-identity/did-operations/did-resolve/resolver';
import CodeError from '../lib/decentralized-identity/util/ErrorCode';

/** Handles the command-line interface Tyron DID operations */
export default class TyronCLI {

    /** Gets network choice from the user */
    private static network(): { network: NetworkNamespace, initTyron: InitTyron } {
        const network = readline.question(LogColors.green(`On which Zilliqa network would you like to operate, mainnet(m), testnet(t) or isolated server(i)?`) + ` - [m/t/i] - Defaults to testnet - ` + LogColors.lightBlue(`Your answer: `));
        // Both default to testnet
        let NETWORK;
        let INIT_TYRON;        //address of the init.tyron smart contract
        switch(network.toLowerCase()) {
            case 'm':
                NETWORK = NetworkNamespace.Mainnet;
                INIT_TYRON = InitTyron.Mainnet;
                break;
            case 'i':
                NETWORK = NetworkNamespace.Isolated;
                INIT_TYRON = InitTyron.Isolated;
                break;
            default:
                // Defaults to testnet
                NETWORK = NetworkNamespace.Testnet;
                INIT_TYRON = InitTyron.Testnet;
                break;
        }
        return {
            network: NETWORK,
            initTyron: INIT_TYRON
        }
    }

    /***            ****            ***/

    /** Handles the `Tyron  DID-Create` operation */
    public static async handleCreate(): Promise<void> {
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        console.log(LogColors.brightGreen(`The user is the contract owner of their Tyron DID smart contract (DIDC)`));
        const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));

        const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 50,000] - ` + LogColors.lightBlue(`Your answer: `));
            
        console.log(LogColors.brightGreen(`Initializing...`));
        await TyronZIL.initialize(
            NETWORK,
            SET_NETWORK.initTyron,
            contractOwner_privateKey,
            gas_limit
        )
        .then(async init => {
            // Adds verification-method inputs & services:
            const KEY_INPUT = await Util.InputKeys();
            const SERVICES = await Util.services();
            
            const CLI_INPUT: CliInputModel = {
                network: NETWORK,
                publicKeyInput: KEY_INPUT,
                services: SERVICES,
                userPrivateKey: contractOwner_privateKey
            };

            /** Executes the `Tyron DID-Create` operation */
            const OPERATION = await DidCreate.execute(CLI_INPUT);
            const TAG = TransitionTag.Create;
            if(OPERATION !== undefined) {
                console.log(LogColors.brightGreen(`Your ${TAG} request  got processed!`));
            } else {
                throw new ErrorCode("RequestUnsuccessful", "Wrong choice. Try again.")
            }

            return {
                init: init,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didCreate => {
            console.log(LogColors.brightGreen(`Let's deploy the user's Tyron DID smart contract!`))
            
            const version = readline.question(LogColors.green(`What version of the DIDC would you like to deploy?`)+` - Versions currently supported: [2.0] - ` + LogColors.lightBlue(`Your answer: `));
            
            // The user deploys their DIDC and calls the TyronInit transition
            const DEPLOYED_CONTRACT = await TyronZIL.deploy(didCreate.init, version);
            const DIDC_ADDR = DEPLOYED_CONTRACT.contract.address!;
            
            const DID = await DidScheme.newDID({network: NETWORK, didUniqueSuffix: DIDC_ADDR});
            console.log(LogColors.green(`The user's Tyron Decentralized Identifier is: `) + LogColors.green(DID.did));

            const PARAMS = await TyronZIL.create(
                "pungtas",
                didCreate.operation.document,
                didCreate.operation.updateKey,
                didCreate.operation.recoveryKey
            );

            await TyronZIL.submit(didCreate.init, DIDC_ADDR, didCreate.tag, PARAMS, ".did");

            // Sets the DIDC's domain name
            const domainName = readline.question(LogColors.green(`What domain name avatar.did would you like to register for your DIDC?`)+` - [e.g.: julio.did] - ` + LogColors.lightBlue(`Your answer: `));
            const DOT_INDEX = domainName.lastIndexOf(".");
            const SSI_DOMAIN = domainName.substring(DOT_INDEX);
            if(SSI_DOMAIN !== ".did") {
                throw new ErrorCode("CodeNotDidDomain", "The DIDC MUST first get registered on a .did domain")
            }
            const AVATAR = domainName.substring(0, DOT_INDEX);
            await Resolver.validateAvatar(AVATAR);

            const DNS_PARAMS = await TyronZIL.dns(".did", AVATAR);
            await TyronZIL.submit(didCreate.init, DIDC_ADDR, TransitionTag.Dns, DNS_PARAMS, ".did");
            return {
                did: DID.did,
                operation: didCreate.operation
            };
        })
        .then( async create => {
            // To save the private keys:
            await Util.savePrivateKeys(create.did, create.operation.privateKeys);
        })
        .catch(err => console.error(LogColors.red(err)))            
    }

    /***            ****            ****/

    /** Updates the DIDC's domain names */
    public static async handleDns(): Promise<void> {
        try {
            const SET_NETWORK = this.network();
            const input = readline.question(LogColors.green(`To fetch the user's DIDC, give the address of the their DID smart contract (1) OR their domain.did (2)`) + ` - [1/2] - ` + LogColors.lightBlue(`Your answer: `));
            let DIDC_ADDR: string;
            switch (input) {
                case "1":
                    DIDC_ADDR = readline.question(LogColors.green(`Provide the DIDC's hex-encoded address`) + LogColors.lightBlue(`Your answer: `));
                    break;
                case "2":
                    const domainName = readline.question(LogColors.green(`What is the user's domain name (to fetch their DID smart contract)? `) + `- [e.g.: uriel.did] - ` + LogColors.lightBlue(`Your answer: `));
                    DIDC_ADDR = await Resolver.resolveDns(SET_NETWORK.network, SET_NETWORK.initTyron, domainName);
                    break;     
                default:
                    throw new CodeError("You have to choose between the previous options");
            };

            const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));

            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
                
            console.log(LogColors.brightGreen(`Initializing...`));
            await TyronZIL.initialize(
                SET_NETWORK.network,
                SET_NETWORK.initTyron,
                contractOwner_privateKey,
                gas_limit
            )
            .then(async init => {
            const domainName = readline.question(LogColors.green(`What domain name avatar.did would you like to register for your DIDC?`)+` - [e.g.: iva.did] - ` + LogColors.lightBlue(`Your answer: `));
            const DOT_INDEX = domainName.lastIndexOf(".");
            const SSI_DOMAIN = domainName.substring(DOT_INDEX);
            if(SSI_DOMAIN !== ".did") {
                throw new ErrorCode("CodeNotDidDomain", "The DIDC MUST get registered on a .did domain")
            }
            const AVATAR = domainName.substring(0, DOT_INDEX);
            await Resolver.validateAvatar(AVATAR);
                    
            const DNS_PARAMS = await TyronZIL.dns(".did", AVATAR);
            await TyronZIL.submit(init, DIDC_ADDR, TransitionTag.Dns, DNS_PARAMS, ".did");
            })
            .catch(err => { throw err })    
        } catch (err) {
            console.error(LogColors.red(err))
        }
    }

    /***            ****            ****/
    
    /** Resolves the Tyron DID and saves it */
    public static async handleResolve(): Promise<void> {
        try {
            const SET_NETWORK = this.network();
            
            /** Asks for the user's domain name to fetch their DIDC */
            const domainName = readline.question(LogColors.green(`What is the user's domain name (to fetch their DID smart contract)? `) + `- [e.g.: uriel.did] - ` + LogColors.lightBlue(`Your answer: `));
            const DIDC_ADDR = await Resolver.resolveDns(SET_NETWORK.network, SET_NETWORK.initTyron, domainName);
            
            /** Whether to resolve the DID as a document or resolution result */
            const RESOLUTION_CHOICE = readline.question(LogColors.green(`Would you like to resolve your DID as a document(1) or as a resolution result(2)? `) + `- [1/2] - Defaults to document - ` + LogColors.lightBlue(`Your answer: `));
            
            let ACCEPT;
            switch (RESOLUTION_CHOICE) {
                case "1":
                    ACCEPT = Accept.contentType                
                    break;
                case "2":
                    ACCEPT = Accept.Result
                    break;
                default:
                    ACCEPT = Accept.contentType
                    break;
            }

            const RESOLUTION_INPUT: ResolutionInput = {
                didcAddr: DIDC_ADDR,
                metadata : {
                    accept: ACCEPT
                }
            }
            console.log(LogColors.brightGreen(`Resolving your request...`));

            /** Resolves the Tyron DID */        
            await DidDoc.resolution(SET_NETWORK.network, RESOLUTION_INPUT)
            .then(async did_resolved => {
                // Saves the DID-Document
                const DID = did_resolved.id;
                await DidDoc.write(DID, did_resolved);
            })
            .catch(err => { throw err })
        } catch (err) { console.error(LogColors.red(err)) } 
    }

    /***            ****            ****/

    /** Handles the `Tyron DID-Recover` operation */
    public static async handleRecover(): Promise<void> {
        console.log(LogColors.brightGreen(`To recover your Tyron DID, let's fetch its current DIDC-State from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the user's domain name to fetch their DIDC */
        const domainName = readline.question(LogColors.green(`What is the user's domain name (to fetch their DID smart contract)? `) + `- [e.g.: uriel.did] - ` + LogColors.lightBlue(`Your answer: `));
        const DIDC_ADDR = await Resolver.resolveDns(NETWORK, SET_NETWORK.initTyron, domainName);
        
        await DidState.fetch(NETWORK, DIDC_ADDR)
        .then(async did_state => {
            const RECOVERY_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide the recovery private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(RECOVERY_PRIVATE_KEY, did_state.did_recovery_key);
            
            // Adds verification-method inputs & services:
            const KEY_INPUT = await Util.InputKeys();
            const SERVICES = await Util.services();

            const CLI_INPUT: CliInputModel = {
                network: NETWORK,
                publicKeyInput: KEY_INPUT,
                services: SERVICES
            };
            const RECOVER_INPUT: RecoverOperationInput = {
                did: did_state.decentralized_identifier,
                recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
                cliInput: CLI_INPUT
            };

            const OPERATION = await DidRecover.execute(RECOVER_INPUT);
            const TAG = TransitionTag.Recover;
            if(OPERATION !== undefined) {
                console.log(LogColors.brightGreen(`Your ${TAG} request  got processed!`));
            } else {
                throw new ErrorCode("RequestUnsuccessful", "Wrong choice. Try again.")
            }

            return {
                state: did_state,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didRecover => {
            console.log(LogColors.brightGreen(`Next, let's save the DID-Recover operation on the Zilliqa blockchain platform, so it stays immutable!`));
            
            const PARAMS = await TyronZIL.recover(
                'pungtas',
                didRecover.operation.newDocument,
                didRecover.operation.docHash,
                didRecover.operation.signature,
                didRecover.operation.newUpdateKey,
                didRecover.operation.newRecoveryKey
            );
            
            const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZED = await TyronZIL.initialize(
                NETWORK,
                SET_NETWORK.initTyron,
                contractOwner_privateKey,
                gas_limit,
            );
            
            await TyronZIL.submit(INITIALIZED, DIDC_ADDR, didRecover.tag, PARAMS, ".did");
            return didRecover;
        })
        .then( async didRecover => {
            // To save the private keys:
            await Util.savePrivateKeys(didRecover.operation.decentralized_identifier, didRecover.operation.privateKeys);

        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /***            ****            ****/

    /** Handles the `Tyron DID-Update` operation */
    public static async handleUpdate(): Promise<void> {
        console.log(LogColors.brightGreen(`To update your Tyron DID, let's fetch its current DIDC state from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the user's domain name to fetch their DIDC */
        const domainName = readline.question(LogColors.green(`What is the user's domain name (to fetch their DID smart contract)? `) + `- [e.g.: julio.did] - ` + LogColors.lightBlue(`Your answer: `));
        const DIDC_ADDR = await Resolver.resolveDns(NETWORK, SET_NETWORK.initTyron, domainName);
        
        await DidState.fetch(NETWORK, DIDC_ADDR)
        .then(async did_state => {
            const UPDATE_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide the update private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(UPDATE_PRIVATE_KEY, did_state.did_update_key);
            
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
                
                let KEY_INPUT;
                let SERVICES;
                const ID = []
                let PATCH_ACTION;
                switch (action) {
                    case '1':
                        PATCH_ACTION = PatchAction.AddKeys;
                        KEY_INPUT = await Util.InputKeys();
                        break;
                    case '2':
                        PATCH_ACTION = PatchAction.RemoveKeys;
                        const amount = readline.question(LogColors.green(`How many keys would you like to remove? - `) + LogColors.lightBlue(`Your answer: `));
                            for(let i=0, t= Number(amount); i<t; ++i) {
                                const KEY_ID = readline.question(LogColors.green(`Next, provide the ID of the key that you would like to remove - `) + LogColors.lightBlue(`Your answer: `));
                                ID.push(KEY_ID)
                            }
                        break;
                    case '3':
                        PATCH_ACTION = PatchAction.AddServices;
                        SERVICES = await Util.services();
                        break;
                    case '4':
                        PATCH_ACTION = PatchAction.RemoveServices;
                        {
                            const amount = readline.question(LogColors.green(`How many services would you like to remove? - `) + LogColors.lightBlue(`Your answer: `));
                            for(let i=0, t= Number(amount); i<t; ++i) {
                                const SERVICE_ID = readline.question(LogColors.green(`Next, provide the ID of the service that you would like to remove - `) + LogColors.lightBlue(`Your answer: `));
                                ID.push(SERVICE_ID)
                            }
                        }
                        break;
                    default:
                        throw new ErrorCode("CodeIncorrectPatchAction", "The chosen action is not valid");
                }
            
                const PATCH: PatchModel = {
                    action: PATCH_ACTION,
                    keyInput: KEY_INPUT,
                    services: SERVICES,
                    ids: ID
                }
                PATCHES.push(PATCH)
            }            
            const UPDATE_INPUT: UpdateOperationInput = {
                state: did_state,
                updatePrivateKey: UPDATE_PRIVATE_KEY,
                patches: PATCHES            
            };

            const OPERATION = await DidUpdate.execute(UPDATE_INPUT);
            const TAG = TransitionTag.Update;
            if(OPERATION !== undefined) {
                console.log(LogColors.brightGreen(`The ${TAG} request  got processed!`));
            } else {
                throw new ErrorCode("RequestUnsuccessful", "Wrong choice. Try again.")
            }
            
            return {
                state: did_state,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didUpdate => {
            console.log(LogColors.brightGreen(`Next, let's save the DID-Update operation on the Zilliqa blockchain platform, so it stays immutable!`));
            
            const PARAMS = await TyronZIL.update(
                "pungtas",
                didUpdate.operation.newDocument,
                didUpdate.operation.docHash,
                didUpdate.operation.signature,
                didUpdate.operation.newUpdateKey
            );

            const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZED = await TyronZIL.initialize(
                NETWORK,
                SET_NETWORK.initTyron,
                contractOwner_privateKey,
                gas_limit,
            );
            
            await TyronZIL.submit(INITIALIZED, DIDC_ADDR, didUpdate.tag, PARAMS, ".did");
            return didUpdate;
        })
        .then( async didUpdate => {
            // To save the private keys:
            await Util.savePrivateKeys(didUpdate.operation.decentralized_identifier, didUpdate.operation.privateKeys)
        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /***            ****            ***/

    /** Handles the `Tyron DID-Deactivate` operation */
    public static async handleDeactivate(): Promise<void> {
        console.log(LogColors.brightGreen(`To deactivate the Tyron DID, let's fetch its current DIDC state from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the user's domain name to fetch their DIDC */
        const domainName = readline.question(LogColors.green(`What is the user's domain name (to fetch their DID smart contract)? `) + `- [e.g.: julio.did] - ` + LogColors.lightBlue(`Your answer: `));
        const DIDC_ADDR = await Resolver.resolveDns(NETWORK, SET_NETWORK.initTyron, domainName);
        
        await DidState.fetch(NETWORK, DIDC_ADDR)
        .then(async did_state => {
            const RECOVERY_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide the recovery private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(RECOVERY_PRIVATE_KEY, did_state.did_recovery_key);
            
            return {
                did_state: did_state,
                recoveryPrivateKey: RECOVERY_PRIVATE_KEY
            }
        })
        .then(async request => {
            const DEACTIVATE_INPUT: DeactivateOperationInput = {
                state: request.did_state,
                recoveryPrivateKey: request.recoveryPrivateKey
            };

            const OPERATION = await DidDeactivate.execute(DEACTIVATE_INPUT);
            const TAG = TransitionTag.Deactivate;
            if(OPERATION !== undefined) {
                console.log(LogColors.brightGreen(`Your ${TAG} request  got processed!`));
            } else {
                throw new ErrorCode("RequestUnsuccessful", "Wrong choice. Try again.")
            }
            
            return {
                request: request,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didDeactivate => {
            console.log(LogColors.brightGreen(`Next, let's save your DID-Deactivate operation on the Zilliqa blockchain platform, so it stays immutable!`));
            
            const PARAMS = await TyronZIL.deactivate(
                "pungtas",
                didDeactivate.operation.signature
            );

            const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZED = await TyronZIL.initialize(
                NETWORK,
                SET_NETWORK.initTyron,
                contractOwner_privateKey,
                gas_limit,
            );
            
            await TyronZIL.submit(INITIALIZED, DIDC_ADDR, didDeactivate.tag, PARAMS, ".did");
        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /** Initializes the SSI Token in the user's DIDC */
    public static async handleSsiToken(): Promise<void> {
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the user's domain name to fetch their DIDC */
        const domainName = readline.question(LogColors.green(`What is the user's domain name (to fetch their DID smart contract)? `) + `- [e.g.: julio.did] - ` + LogColors.lightBlue(`Your answer: `));
        const DIDC_ADDR = await Resolver.resolveDns(NETWORK, SET_NETWORK.initTyron, domainName);
        const token = readline.question(LogColors.green(`What is the SSI Token that you would like to register into your DIDC? `) + `- [e.g.: xsgd] - ` + LogColors.lightBlue(`Your answer: `));
        const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
        const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));

        await TyronZIL.initialize(
            NETWORK,
            SET_NETWORK.initTyron,
            contractOwner_privateKey,
            gas_limit,
        ).then(async init => {
            const PARAMS = await TyronZIL.ssiToken(token);
            await TyronZIL.submit(init, DIDC_ADDR, TransitionTag.SsiToken, PARAMS, ".did");
        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /** Initializes the donation campaign code in the user's DIDC */
    public static async handleDonation(): Promise<void> {
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the user's domain name to fetch their DIDC */
        const domainName = readline.question(LogColors.green(`What is the user's domain name (to fetch their DID smart contract)? `) + `- [e.g.: julio.did] - ` + LogColors.lightBlue(`Your answer: `));
        const DIDC_ADDR = await Resolver.resolveDns(NETWORK, SET_NETWORK.initTyron, domainName);
        const campaign = readline.question(LogColors.green(`What is the donation campaign code that you would like to register into your DIDC? `) + `- [e.g.: covid-aid] - ` + LogColors.lightBlue(`Your answer: `));
        const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
        const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));

        await TyronZIL.initialize(
            NETWORK,
            SET_NETWORK.initTyron,
            contractOwner_privateKey,
            gas_limit,
        ).then(async init => {
            const PARAMS = await TyronZIL.donate(campaign);
            await TyronZIL.submit(init, DIDC_ADDR, TransitionTag.Donate, PARAMS, ".did");
        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /** Donates $XSGD */
    public static async handleDonate(): Promise<void> {
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the user's domain name to fetch their DIDC */
        const domainName = readline.question(LogColors.green(`What is the user's domain name? `) + `- [e.g.: julio.did] - ` + LogColors.lightBlue(`Your answer: `));
        const campaign = readline.question(LogColors.green(`What is the donation campaign code? `) + `- [e.g.: covid-aid] - ` + LogColors.lightBlue(`Your answer: `));
        const contractOwner_privateKey = readline.question(LogColors.green(`What is the user's private key (contract owner key)?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
        const toDomainName = readline.question(LogColors.green(`What is the user's domain name that you would like to donate $XSGD? `) + `- [e.g.: mar.did] - ` + LogColors.lightBlue(`Your answer: `));
        const amount = readline.question(LogColors.green(`How many $XSGD would you like to donate? - `) + LogColors.lightBlue(`Your answer: `))
        const xsgdPrivateKey = readline.question(LogColors.green(`What is your $XSGD private key? - `) + LogColors.lightBlue(`Your answer: `))
        const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
        
        await TyronZIL.initialize(
            NETWORK,
            SET_NETWORK.initTyron,
            contractOwner_privateKey,
            gas_limit,
        ).then(async init => {
            const DIDC_ADDR = await Resolver.resolveDns(NETWORK, SET_NETWORK.initTyron, domainName);
            const TO_DIDC_ADDR = await Resolver.resolveDns(NETWORK, SET_NETWORK.initTyron, toDomainName);
        
            const xsgd_privateKey = zcrypto.normalizePrivateKey(xsgdPrivateKey);
            const xsgd_publicKey = zcrypto.getPubKeyFromPrivateKey(xsgd_privateKey);
            const to_addr = zcrypto.fromBech32Address(TO_DIDC_ADDR).substring(2);
            const SIGNATURE = "0x"+ zcrypto.sign(Buffer.from(to_addr, 'hex'), xsgd_privateKey, xsgd_publicKey);
            
            const PARAMS = await TyronZIL.xTransfer(campaign, "xsgd", "pungtas", zcrypto.fromBech32Address(TO_DIDC_ADDR), String(Number(amount)*1e6), SIGNATURE );
            await TyronZIL.submit(init, DIDC_ADDR, TransitionTag.XTranfer, PARAMS, ".did");
        })
        .catch(err => console.error(LogColors.red(err)))
    }
}
