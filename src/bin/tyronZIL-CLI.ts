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
import Util, { CliInputModel, PrivateKeys, Account} from './util';
import TyronTransaction, { TransitionTag } from '../lib/blockchain/tyron-transaction';
import { ContractInit, TyronInitContracts } from '../lib/blockchain/tyron-contract';
import DidScheme, { NetworkNamespace } from '../lib/decentralized-identity/tyronZIL-schemes/did-scheme';
import DidState from '../lib/decentralized-identity/did-state';
import DidDoc, {ResolutionInput, Accept, ResolutionResult} from '../lib/decentralized-identity/did-document';
import { PatchAction, PatchModel } from '../lib/decentralized-identity/sidetree-protocol/models/document-model';
import ErrorCode from '../lib/decentralized-identity/util/ErrorCode';
import LogColors from './log-colors';
import * as readline from 'readline-sync';

/** Handles the command-line interface Tyron DID operations */
export default class TyronCLI {
    /** Gets network choice from the user */
    private static network(): { network: NetworkNamespace, tyronInit: TyronInitContracts } {
        const network = readline.question(LogColors.green(`On which Zilliqa network would you like to operate, mainnet(m) or testnet(t)?`) + ` - [m/t] - Defaults to testnet - ` + LogColors.lightBlue(`Your answer: `));
        // Both default to testnet
        let NETWORK;
        let TYRON_INIT;        //address of the TyronInit smart-contract
        switch(network.toLowerCase()) {
            case 'm':
                NETWORK = NetworkNamespace.Mainnet;
                TYRON_INIT = TyronInitContracts.Mainnet;
                break;
            default:
                // Defaults to testnet
                NETWORK = NetworkNamespace.Testnet;
                TYRON_INIT = TyronInitContracts.Testnet;
                break;
        }
        return {
            network: NETWORK,
            tyronInit: TYRON_INIT
        }
    }

    /** Initializes the client account */
    private static async clientInit(): Promise<Account> {
        const client_privateKey = readline.question(LogColors.green(`What is the client's private key? - `) + LogColors.lightBlue(`Your answer: `));
        const CLIENT_ADDR = zcrypto.getAddressFromPrivateKey(client_privateKey);
        const CLIENT: Account = {
            addr: CLIENT_ADDR,
            privateKey: client_privateKey,
        };
        return CLIENT;
    }

    /***            ****            ***/

    /** Handles the `Tyron  DID-Create` operation */
    public static async handleCreate(): Promise<void> {
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        await this.clientInit()
        .then(async client => {
            console.log(LogColors.brightGreen(`The user instantiate their Tyron DID-Smart-Contract (DSM) with a private key as the 'contract_owner'`));
            const user_privateKey = readline.question(LogColors.green(`As the user, you're the owner of your DSM! Which private key do you choose? - `) + LogColors.lightBlue(`Your answer: `));
            const CONTRACT_OWNER = zcrypto.getAddressFromPrivateKey(user_privateKey);
            const USER: Account = {
                addr: CONTRACT_OWNER,
                privateKey: user_privateKey
            };
            
            console.log(LogColors.brightGreen(`Initializing...`));
            const CONTRACT_INIT: ContractInit = {
                tyron_init: SET_NETWORK.tyronInit,
                contract_owner: USER.addr,
                client_addr: client.addr,
                tyron_stake: 50000000000000        //e.g. 50 ZIL
            };

            const gas_limit = readline.question(LogColors.green(`What is your gas limit?`) + ` - [Recommended value: 20,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZE = await TyronTransaction.initialize(
                NETWORK,
                CONTRACT_INIT,
                client.privateKey,
                Number(gas_limit),
                USER.privateKey,
            );
            
            return {
                client: client,
                user: USER,
                init: INITIALIZE
            };
        })
        .then(async didInit => {
            // Adds public keys and service endpoints:
            const PUBLIC_KEYS = await Util.InputKeys();
            const SERVICE = await Util.InputService();

            const CLI_INPUT: CliInputModel = {
                network: NETWORK,
                publicKeyInput: PUBLIC_KEYS,
                service: SERVICE
            };

            /** Executes the `Tyron DID-Create` operation */
            const OPERATION = await DidCreate.execute(CLI_INPUT);
            const TAG = TransitionTag.Create;
            if(OPERATION !== undefined) {
                console.log(LogColors.brightGreen(`Your ${TAG} request was accepted!`));
            } else {
                throw new ErrorCode("RequestUnsuccessful", "Wrong choice. Try again.")
            }

            return {
                didInit: didInit,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didCreate => {
            console.log(LogColors.brightGreen(`Let's deploy your Tyron DID-Smart-Contract!`))
            
            const version = readline.question(LogColors.green(`What version of the DSM would you like to deploy?`)+` - [0.5] - Versions currently supported: 0.5 - ` + LogColors.lightBlue(`Your answer: `));
            
            // The user deploys their DSM and calls the ContractInit transition
            const DEPLOYED_CONTRACT = await TyronTransaction.deploy(didCreate.didInit.init, version);
            const TYRON_ADDR = DEPLOYED_CONTRACT.contract.address!;
            
            const DID = await DidScheme.newDID({network: NETWORK, didUniqueSuffix: TYRON_ADDR});
            console.log(LogColors.green('Your Tyron Decentralized Identifier is: ') + LogColors.green(DID.did));

            const PARAMS = await TyronTransaction.create(
                didCreate.operation.documentModel,
                didCreate.operation.updateKey,
                didCreate.operation.recoveryKey
            );

            await TyronTransaction.submit(didCreate.didInit.init, TYRON_ADDR!, didCreate.tag, PARAMS);

            /***            ****            ***/
            
            // To save the private keys:
            const PRIVATE_KEYS: PrivateKeys = {
                privateKeys: didCreate.operation.privateKey,
                updatePrivateKey: didCreate.operation.updatePrivateKey,
                recoveryPrivateKey: didCreate.operation.recoveryPrivateKey,
            };
            await Util.savePrivateKeys(DID.did, PRIVATE_KEYS);
        })
        .catch(err => console.error(LogColors.red(err)))            
    }

    /***            ****            ****/

    /** Resolves the tyronZIL DID and saves it */
    public static async handleResolve(): Promise<void> {
        try {
            const SET_NETWORK = this.network();
            const DID = readline.question(LogColors.green(`Which Tyron Decentralized Identifier would you like to resolve? - `) + LogColors.lightBlue(`Your answer: `));
            /** Asks for the address of the user's DSM */
            const tyronAddr = readline.question(LogColors.green(`What is the address of its Tyron DID-Smart-Contract (DSM) - `) + LogColors.lightBlue(`Your answer: `));
            if(!zcrypto.isValidChecksumAddress(tyronAddr)) {
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
                did: DID,
                metadata : {
                    accept: ACCEPT
                }
            }
            console.log(LogColors.brightGreen(`Resolving your request...`));

            /** Resolves the tyronZIL DID */        
            await DidDoc.resolution(SET_NETWORK.network, tyronAddr, RESOLUTION_INPUT)
            .then(async did_resolved => {
                const DID_RESOLVED = did_resolved as ResolutionResult|DidDoc;
                // Saves the DID-Document
                await DidDoc.write(DID, DID_RESOLVED);
            })
            .catch(err => { throw err })
        } catch (err) {
            console.error(LogColors.red(err))
        } 
    }

    /***            ****            ****/

    /** Handles the `Tyron DID-Update` operation */
    public static async handleUpdate(): Promise<void> {
        console.log(LogColors.brightGreen(`To update your tyronZIL DID, let's fetch its current DSM-State from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        /** Asks for the address of the user's DSM */
        const tyronAddr = readline.question(LogColors.green(`What is the address of the user's Tyron DID-Smart-Contract (DSM)? - `) + LogColors.lightBlue(`Your answer: `));
        
        await DidState.fetch(NETWORK, tyronAddr)
        .then(async did_state => {
            const UPDATE_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide your update private key - `) + LogColors.lightBlue(`Your answer: `));
            const CLIENT = await this.clientInit();
        
            return {
                state: did_state,
                updatePrivateKey: UPDATE_PRIVATE_KEY,
                client: CLIENT
            }
        })
        .then(async request => {
            const patches_amount = readline.question(LogColors.green(`How many patches would you like to make? - `) + LogColors.lightBlue(`Your answer: `));
            const PATCHES = [];
            for(let i=0, t= Number(patches_amount); i<t; ++i) {
                // Asks for the specific patch action to update the DID:
                const action = readline.question(LogColors.green(`You may choose one of the following actions to update your DID:
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
                state: request.state,
                updatePrivateKey: request.updatePrivateKey,
                patches: PATCHES            
            };

            const OPERATION = await DidUpdate.execute(UPDATE_INPUT);
            const TAG = TransitionTag.Update;
            if(OPERATION !== undefined) {
                console.log(LogColors.brightGreen(`Your ${TAG} request was accepted!`));
            } else {
                throw new ErrorCode("RequestUnsuccessful", "Wrong choice. Try again.")
            }
            
            /***            ****            ***/

            // To save the private keys:
            const PRIVATE_KEYS: PrivateKeys = {
                privateKeys: OPERATION.privateKey,
                updatePrivateKey: OPERATION.newUpdatePrivateKey,
            };
            await Util.savePrivateKeys(OPERATION.decentralized_identifier, PRIVATE_KEYS)
            
            return {
                state: request.state,
                client: request.client,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didUpdate => {
            console.log(LogColors.brightGreen(`Next, let's save your DID-Update operation on the Zilliqa blockchain platform, so it stays immutable!`));
            
            const PARAMS = await TyronTransaction.update(
                didUpdate.operation.newDocument,
                didUpdate.operation.signature,
                didUpdate.operation.newUpdateKey
            );

            const CONTRACT_INIT: ContractInit = {
                tyron_init: SET_NETWORK.tyronInit,
                contract_owner: didUpdate.state.contract_owner,
                client_addr: didUpdate.client.addr,
                tyron_stake: 50000000000000        //e.g. 50 ZIL
            };

            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZE = await TyronTransaction.initialize(
                NETWORK,
                CONTRACT_INIT,
                didUpdate.client.privateKey,
                Number(gas_limit),
            );
            
            await TyronTransaction.submit(INITIALIZE, tyronAddr, didUpdate.tag, PARAMS);
        })
        .catch(err => console.error(LogColors.red(err)))
    }

    /***            ****            ***/

    /** Handles the `Tyron DID-Recover` operation */
    public static async handleRecover(): Promise<void> {
        console.log(LogColors.brightGreen(`To recover your tyronZIL DID, let's fetch its current DSM-State from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        /** Asks for the address of the user's DSM */
        const tyronAddr = readline.question(LogColors.green(`What is the address of the user's Tyron DID-Smart-Contract (DSM)? - `) + LogColors.lightBlue(`Your answer: `));
        
        await DidState.fetch(NETWORK, tyronAddr)
        .then(async did_state => {
            const RECOVERY_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide your recovery private key - `) + LogColors.lightBlue(`Your answer: `));
            const CLIENT = await this.clientInit();
            
            return {
                state: did_state,
                recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
                client: CLIENT
            }
        })
        .then(async request => {
            // Adds public keys and service endpoints:
            const PUBLIC_KEYS = await Util.InputKeys();
            const SERVICE = await Util.InputService();

            const CLI_INPUT: CliInputModel = {
                network: NETWORK,
                publicKeyInput: PUBLIC_KEYS,
                service: SERVICE
            };
            const RECOVER_INPUT: RecoverOperationInput = {
                did: request.state.decentralized_identifier,
                recoveryPrivateKey: request.recoveryPrivateKey,
                cliInput: CLI_INPUT
            };

            const OPERATION = await DidRecover.execute(RECOVER_INPUT) as DidRecover;
            const TAG = TransitionTag.Recover;
            if(OPERATION !== undefined) {
                console.log(LogColors.brightGreen(`Your ${TAG} request was accepted!`));
            } else {
                throw new ErrorCode("RequestUnsuccessful", "Wrong choice. Try again.")
            }

            /***            ****            ***/
            
            // To save the private keys:
            const PRIVATE_KEYS: PrivateKeys = {
                privateKeys: OPERATION.privateKey,
                updatePrivateKey: OPERATION.newUpdatePrivateKey,
                recoveryPrivateKey: OPERATION.newRecoveryPrivateKey,
            };
            await Util.savePrivateKeys(OPERATION.decentralized_identifier, PRIVATE_KEYS);

            return {
                state: request.state,
                client: request.client,
                operation: OPERATION,
                tag: TAG
            };
        })
        .then(async didRecover => {
            console.log(LogColors.brightGreen(`Next, let's save your DID-Recover operation on the Zilliqa blockchain platform, so it stays immutable!`));
            
            const PARAMS = await TyronTransaction.recover(
                didRecover.operation.newDocument,
                didRecover.operation.signature,
                didRecover.operation.newUpdateKey,
                didRecover.operation.newRecoveryKey
            );

            const CONTRACT_INIT: ContractInit = {
                tyron_init: SET_NETWORK.tyronInit,
                contract_owner: didRecover.state.contract_owner,
                client_addr: didRecover.client.addr,
                tyron_stake: 50000000000000        //e.g. 50 ZIL
            };

            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 10,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZE = await TyronTransaction.initialize(
                NETWORK,
                CONTRACT_INIT,
                didRecover.client.privateKey,
                Number(gas_limit),
            );
            
            await TyronTransaction.submit(INITIALIZE, tyronAddr, didRecover.tag, PARAMS);
        })
        .catch(err => console.error(LogColors.red(err)))
    }
    
    /***            ****            ***/

    /** Handles the `Tyron DID-Deactivate` operation */
    public static async handleDeactivate(): Promise<void> {
        console.log(LogColors.brightGreen(`To deactivate your tyronZIL DID, let's fetch its current DSM-State from the Zilliqa blockchain platform!`));
        const SET_NETWORK = this.network();
        const NETWORK = SET_NETWORK.network;
        /** Asks for the address of the user's DSM */
        const tyronAddr = readline.question(LogColors.green(`What is the address of the user's Tyron DID-Smart-Contract (DSM)? - `) + LogColors.lightBlue(`Your answer: `));
        
        await DidState.fetch(NETWORK, tyronAddr)
        .then(async did_state => {
            const RECOVERY_PRIVATE_KEY = readline.question(LogColors.brightGreen(`DID-State retrieved!`) + LogColors.green(` - Provide your recovery private key - `) + LogColors.lightBlue(`Your answer: `));
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
                console.log(LogColors.brightGreen(`Your ${TAG} request was accepted!`));
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
            const CLIENT = await this.clientInit();
            const PARAMS = await TyronTransaction.deactivate(
                didDeactivate.operation.signature
            );

            const CONTRACT_INIT: ContractInit = {
                tyron_init: SET_NETWORK.tyronInit,
                contract_owner: didDeactivate.request.did_state.contract_owner,
                client_addr: CLIENT.addr,
                tyron_stake: 50000000000000        //e.g. 50 ZIL
            };

            const gas_limit = readline.question(LogColors.green(`What is the gas limit?`) + ` - [Recommended value: 5,000] - ` + LogColors.lightBlue(`Your answer: `));
            
            const INITIALIZE = await TyronTransaction.initialize(
                NETWORK,
                CONTRACT_INIT,
                CLIENT.privateKey,
                Number(gas_limit),
            );
            
            await TyronTransaction.submit(INITIALIZE, tyronAddr, didDeactivate.tag, PARAMS);
        })
        .catch(err => console.error(LogColors.red(err)))
    }
}




