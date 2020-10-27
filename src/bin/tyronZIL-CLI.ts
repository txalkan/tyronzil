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
import TyronTransaction, { InitTyronSM, TransitionTag } from '../lib/blockchain/tyron-transaction';
import DidScheme, { NetworkNamespace } from '../lib/decentralized-identity/tyronZIL-schemes/did-scheme';
import DidState from '../lib/decentralized-identity/did-state';
import DidDoc, {ResolutionInput, Accept } from '../lib/decentralized-identity/did-document';
import { PatchAction, PatchModel } from '../lib/decentralized-identity/sidetree-protocol/models/document-model';
import ErrorCode from '../lib/decentralized-identity/util/ErrorCode';
import LogColors from './log-colors';
import * as readline from 'readline-sync';

/** Handles the command-line interface Tyron DID operations */
export default class TyronCLI {

    /** Gets network choice from the user */
    private static network(): { network: NetworkNamespace, init_tyron: InitTyronSM } {
        const network = readline.question(LogColors.green(`On which Zilliqa network would you like to operate, mainnet(m) or testnet(t)?`) + ` - [m/t] - Defaults to testnet - ` + LogColors.lightBlue(`Your answer: `));
        // Both default to testnet
        let NETWORK;
        let INIT_TYRON;        //address of the init_tyron smart-contract
        switch(network.toLowerCase()) {
            case 'm':
                NETWORK = NetworkNamespace.Mainnet;
                INIT_TYRON = InitTyronSM.Mainnet;
                break;
            default:
                // Defaults to testnet
                NETWORK = NetworkNamespace.Testnet;
                INIT_TYRON = InitTyronSM.Testnet;
                break;
        }
        return {
            network: NETWORK,
            init_tyron: INIT_TYRON
        }
    }

    /***            ****            ***/

    /** Handles the `Tyron  DID-Create` operation */
    public static async handleCreate(): Promise<void> {
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        console.log(LogColors.brightGreen(`The user is the contract owner of their Tyron DID-Smart-Contract (DIDC)`));
        const user_addr = readline.question(LogColors.green(`What is the user's address?`) + ` - [Bech32 address] - ` + LogColors.lightBlue(`Your answer: `));

        const client_privateKey = readline.question(LogColors.green(`What is the client's private key?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
        const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 20,000] - ` + LogColors.lightBlue(`Your answer: `));
            
        console.log(LogColors.brightGreen(`Initializing...`));
        await TyronTransaction.initialize(
            NETWORK,
            SET_NETWORK.init_tyron,
            client_privateKey,
            gas_limit,
            user_addr
        )
        .then(async init => {
            // Adds public keys and service endpoints:
            const PUBLIC_KEYS = await Util.InputKeys();
            const SERVICE = await Util.InputService();

            console.log(LogColors.brightGreen(`As the contract owner, the user MUST sign their first DID-Document for the DIDC to accept it.`));
            const user_privateKey = readline.question(LogColors.green(`What is the user's private key?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
            
            const CLI_INPUT: CliInputModel = {
                network: NETWORK,
                publicKeyInput: PUBLIC_KEYS,
                service: SERVICE,
                userPrivateKey: user_privateKey
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
            console.log(LogColors.brightGreen(`Let's deploy the user's Tyron DID-Smart-Contract!`))
            
            const version = readline.question(LogColors.green(`What version of the DIDC would you like to deploy?`)+` - Versions currently supported: [1.0.0] - ` + LogColors.lightBlue(`Your answer: `));
            
            // The user deploys their DIDC and calls the TyronInit transition
            const DEPLOYED_CONTRACT = await TyronTransaction.deploy(didCreate.init, version);
            const TYRON_ADDR = DEPLOYED_CONTRACT.contract.address!;
            
            const DID = await DidScheme.newDID({network: NETWORK, didUniqueSuffix: TYRON_ADDR});
            console.log(LogColors.green(`The user's Tyron Decentralized Identifier is: `) + LogColors.green(DID.did));

            const PARAMS = await TyronTransaction.create(
                didCreate.operation.document,
                didCreate.operation.didContractOwner,
                didCreate.operation.signature,
                didCreate.operation.updateKey,
                didCreate.operation.recoveryKey
            );

            await TyronTransaction.submit(didCreate.init, TYRON_ADDR!, didCreate.tag, PARAMS);

            /***            ****            ***/
            
            // To save the private keys:
            await Util.savePrivateKeys(DID.did, didCreate.operation.privateKeys);
        })
        .catch(err => console.error(LogColors.red(err)))            
    }

    /***            ****            ****/

    /** Resolves the Tyron DID and saves it */
    public static async handleResolve(): Promise<void> {
        try {
            const SET_NETWORK = this.network();
            
            /** Asks for the address of the user's DIDC */
            const tyron_addr = readline.question(LogColors.green(`What is the address of the user's Tyron DID-Smart-Contract (DIDC)`) + ` - [Hex-encoded address] - ` + LogColors.lightBlue(`Your answer: `));
            if(!zcrypto.isValidChecksumAddress(tyron_addr)) {
                throw new ErrorCode("WrongAddress", "The format of the address is wrong")
            }

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
                tyronAddr: tyron_addr,
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
        } catch (err) {
            console.error(LogColors.red(err))
        } 
    }

    /***            ****            ****/

    /** Handles the `Tyron DID-Recover` operation */
    public static async handleRecover(): Promise<void> {
        console.log(LogColors.brightGreen(`To recover your Tyron DID, let's fetch its current DIDC-State from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the address of the user's DIDC */
        const tyronAddr = readline.question(LogColors.green(`What is the address of the user's Tyron DID-Smart-Contract (DIDC)? - `) + LogColors.lightBlue(`Your answer: `));
        if(!zcrypto.isValidChecksumAddress(tyronAddr)) {
            throw new ErrorCode("WrongAddress", "The given address is not checksumed")
        }

        await DidState.fetch(NETWORK, tyronAddr)
        .then(async did_state => {
            const RECOVERY_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide the recovery private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(RECOVERY_PRIVATE_KEY, did_state.did_recovery_key);
            
            // Adds public keys and service endpoints:
            const PUBLIC_KEYS = await Util.InputKeys();
            const SERVICE = await Util.InputService();

            const CLI_INPUT: CliInputModel = {
                network: NETWORK,
                publicKeyInput: PUBLIC_KEYS,
                service: SERVICE
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

            /***            ****            ***/
            
            // To save the private keys:
            await Util.savePrivateKeys(OPERATION.decentralized_identifier, OPERATION.privateKeys);

            return {
                state: did_state,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didRecover => {
            console.log(LogColors.brightGreen(`Next, let's save the DID-Recover operation on the Zilliqa blockchain platform, so it stays immutable!`));
            
            const PARAMS = await TyronTransaction.recover(
                didRecover.operation.newDocument,
                didRecover.operation.signature,
                didRecover.operation.newUpdateKey,
                didRecover.operation.newRecoveryKey
            );
            
            const client_privateKey = readline.question(LogColors.green(`What is the client's private key?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZED = await TyronTransaction.initialize(
                NETWORK,
                SET_NETWORK.init_tyron,
                client_privateKey,
                gas_limit,
            );
            
            await TyronTransaction.submit(INITIALIZED, tyronAddr, didRecover.tag, PARAMS);
        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /***            ****            ****/

    /** Handles the `Tyron DID-Update` operation */
    public static async handleUpdate(): Promise<void> {
        console.log(LogColors.brightGreen(`To update your Tyron DID, let's fetch its current DIDC-State from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        
        /** Asks for the address of the user's DIDC */
        const tyronAddr = readline.question(LogColors.green(`What is the address of the user's Tyron DID-Smart-Contract (DIDC)? - `) + LogColors.lightBlue(`Your answer: `));
        if(!zcrypto.isValidChecksumAddress(tyronAddr)) {
            throw new ErrorCode("WrongAddress", "The given address is not checksumed")
        }

        await DidState.fetch(NETWORK, tyronAddr)
        .then(async did_state => {
            const UPDATE_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide the update private key - `) + LogColors.lightBlue(`Your answer: `));
            await Util.verifyKey(UPDATE_PRIVATE_KEY, did_state.did_update_key);
            
            const patches_amount = readline.question(LogColors.green(`How many patches would you like to make? - `) + LogColors.lightBlue(`Your answer: `));
            const PATCHES = [];
            for(let i=0, t= Number(patches_amount); i<t; ++i) {
                // Asks for the specific patch action to update the DID:
                const action = readline.question(LogColors.green(`You may choose one of the following actions to update the DID:
                'add-keys'(1),
                'remove-keys'(2),
                'add-services'(3),
                'remove-services'(4)`)
                + ` - [1/2/3/4] - ` + LogColors.lightBlue(`Your answer: `));
        
                const ID = [];
                let KEYS;
                let SERVICE;
                let PATCH_ACTION;
                switch (action) {
                    case '1':
                        PATCH_ACTION = PatchAction.AddKeys;
                        KEYS = await Util.InputKeys();
                        break;
                    case '2':
                        PATCH_ACTION = PatchAction.RemoveKeys;
                        {
                            const amount = readline.question(LogColors.green(`How many keys would you like to remove? - `) + LogColors.lightBlue(`Your answer: `));
                            for(let i=0, t= Number(amount); i<t; ++i) {
                                const KEY_ID = readline.question(LogColors.green(`Next, provide the ID of the key that you would like to remove - `) + LogColors.lightBlue(`Your answer: `));
                                ID.push(KEY_ID)
                            }
                        }
                        break;
                    case '3':
                        PATCH_ACTION = PatchAction.AddServices;
                        SERVICE = await Util.InputService();
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
                    keyInput: KEYS,
                    service_endpoints: SERVICE,
                    ids: ID,
                    public_keys: ID
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
            
            /***            ****            ***/

            // To save the private keys:
            await Util.savePrivateKeys(OPERATION.decentralized_identifier, OPERATION.privateKeys)
            
            return {
                state: did_state,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didUpdate => {
            console.log(LogColors.brightGreen(`Next, let's save the DID-Update operation on the Zilliqa blockchain platform, so it stays immutable!`));
            
            const PARAMS = await TyronTransaction.update(
                didUpdate.operation.newDocument,
                didUpdate.operation.signature,
                didUpdate.operation.newUpdateKey
            );

            const client_privateKey = readline.question(LogColors.green(`What is the client's private key?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZED = await TyronTransaction.initialize(
                NETWORK,
                SET_NETWORK.init_tyron,
                client_privateKey,
                gas_limit,
            );
            
            await TyronTransaction.submit(INITIALIZED, tyronAddr, didUpdate.tag, PARAMS);
        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /***            ****            ***/

    /** Handles the `Tyron DID-Deactivate` operation */
    public static async handleDeactivate(): Promise<void> {
        console.log(LogColors.brightGreen(`To deactivate the Tyron DID, let's fetch its current DIDC-State from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        /** Asks for the address of the user's DIDC */
        const tyronAddr = readline.question(LogColors.green(`What is the address of the user's Tyron DID-Smart-Contract (DIDC)? - `) + LogColors.lightBlue(`Your answer: `));
        if(!zcrypto.isValidChecksumAddress(tyronAddr)) {
            throw new ErrorCode("WrongAddress", "The given address is not checksumed")
        }
        
        await DidState.fetch(NETWORK, tyronAddr)
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
            
            const PARAMS = await TyronTransaction.deactivate(
                didDeactivate.operation.signature
            );

            const client_privateKey = readline.question(LogColors.green(`What is the client's private key?`) + ` - [Hex-encoded private key] - ` + LogColors.lightBlue(`Your answer: `));
            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZED = await TyronTransaction.initialize(
                NETWORK,
                SET_NETWORK.init_tyron,
                client_privateKey,
                gas_limit,
            );
            
            await TyronTransaction.submit(INITIALIZED, tyronAddr, didDeactivate.tag, PARAMS);
        })
        .catch(err => console.error(LogColors.red(err)))
    }
}
