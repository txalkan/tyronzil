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

import LogColors from './log-colors';
import DidCreate from '../lib/did-operations/did-create';
import DidRecover, { RecoverOperationInput } from '../lib/did-operations/did-recover';
import { CliInputModel, PublicKeyInput } from '../lib/models/cli-input-model';
import TyronZILScheme from '../lib/tyronZIL-schemes/did-scheme';
import { NetworkNamespace, SchemeInputData } from '../lib/tyronZIL-schemes/did-scheme';
import * as readline from 'readline-sync';
import { PublicKeyPurpose } from '../lib/models/verification-method-models';
import { LongFormDidInput, TyronZILUrlScheme } from '../lib/tyronZIL-schemes/did-url-scheme';
import DidState from '../lib/did-state';
import * as fs from 'fs';
import DidDoc from '../lib/did-document';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { PrivateKeys, Cryptography} from '../lib/did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../lib/ErrorCode';
import DidDeactivate, { DeactivateOperationInput } from '../lib/did-operations/did-deactivate';
import { PatchAction, PatchModel } from '../lib/models/patch-model';
import DidUpdate, { UpdateOperationInput } from '../lib/did-operations/did-update';

/** Handles the command-line interface DID operations */
export default class TyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate(): Promise<void> {
        /** Gets network choice from the user */
        const network = readline.question(`On which Zilliqa network do you want to create your tyronZIL DID, mainnet(m) or testnet(t)? [m/t] - Defaults to testnet - ` + LogColors.lightBlue(`Your answer: `));
        
        if (network.toLowerCase() !== 'm' && network.toLowerCase() !== 't') {
            console.log(LogColors.green(`Creating your tyronZIL DID on the Zilliqa testnet..`));
        }

        // Defaults to testnet
        let NETWORK: NetworkNamespace = NetworkNamespace.Testnet;
        switch(network.toLowerCase()) {
            case 'm':
                NETWORK = NetworkNamespace.Mainnet;
                break;
            case 't':
                NETWORK = NetworkNamespace.Testnet;
                break;
        }

        /***            ****            ***/
        
        // Adds public keys and service endpoints:
        const PUBLIC_KEYS = await this.InputKeys();
        const SERVICE = await this.InputService();

        const CLI_INPUT: CliInputModel = {
            network: NETWORK,
            publicKeyInput: PUBLIC_KEYS,
            service: SERVICE
        }

        /***            ****            ***/

        // Executes the DID-create operation:
        const DID_EXECUTED = await DidCreate.executeCli(CLI_INPUT);

        /** The globally unique part of the DID */
        const DID_SUFFIX = DID_EXECUTED.didUniqueSuffix;
        
        /***            ****            ***/

        const DID_DATA: SchemeInputData = {
            network: NETWORK,
            didUniqueSuffix: DID_SUFFIX
        };
        
        /** The tyronZIL DID-scheme */
        const DID_SCHEME = await TyronZILScheme.newDID(DID_DATA);

        /** tyronZIL DID instance with the proper DID-scheme */
        const DID_tyronZIL = DID_SCHEME.did_tyronZIL;
        
        console.log(LogColors.green(`Your decentralized identity on Zilliqa is: `) + LogColors.brightGreen(`${DID_tyronZIL}`));     
        
        /***            ****            ***/

        // Generates the Sidetree Long-Form DID
        if (DID_EXECUTED.encodedDelta !== undefined) {
            const LONG_DID_INPUT: LongFormDidInput = {
                schemeInput: DID_DATA,
                encodedSuffixData: DID_EXECUTED.encodedSuffixData,
                encodedDelta: DID_EXECUTED.encodedDelta
            }

            const LONG_FORM_DID = await TyronZILUrlScheme.longFormDid(LONG_DID_INPUT);

            const LONG_DID_tyronZIL = LONG_FORM_DID.longFormDid;

            console.log(LogColors.green(`The corresponding Sidetree Long-Form DID is: `) + `${LONG_DID_tyronZIL}`);
        }

        /***            ****            ***/

        /** The tyronZIL DID-state */
        const DID_STATE = await DidState.build(DID_EXECUTED);
        
        // Saves the DID-state
        try{
            await DidState.write(DID_STATE);
        } catch {
            throw new SidetreeError(ErrorCode.CouldNotSave);
        }
        
        /***            ****            ***/

        /** Resolves the created tyronZIL DID into its DID-document */        
        const DID_RESOLVED = await DidDoc.resolve(DID_STATE);
        
        // Saves the DID-document
        try{
            await DidDoc.write(DID_RESOLVED);
        } catch {
            throw new SidetreeError(ErrorCode.CouldNotSave);
        }

        /***            ****            ***/

        // Saves the private keys:
        const PRIVATE_KEYS: PrivateKeys = {
            privateKeys: DID_EXECUTED.privateKey,
            updatePrivateKey: Encoder.encode(Buffer.from(JSON.stringify(DID_EXECUTED.updatePrivateKey))),
            recoveryPrivateKey: Encoder.encode(Buffer.from(JSON.stringify(DID_EXECUTED.recoveryPrivateKey))),
        };
        const KEY_FILE_NAME = `DID_PRIVATE_KEYS_${DID_tyronZIL}.json`;
        fs.writeFileSync(KEY_FILE_NAME, JSON.stringify(PRIVATE_KEYS, null, 2));
        console.info(LogColors.yellow(`Private keys saved as: ${LogColors.brightYellow(KEY_FILE_NAME)}`));
    }


    /** Handles the update subcommand */
    public static async handleUpdate(): Promise<void> {
        /** Gets DID to update from the user */
        const DID = readline.question(`Which tyronZIL DID would you like to update? [tyronZIL DID-scheme] - ` + LogColors.lightBlue(`Your answer: `));
        
        // Validates the DID-scheme
        let DID_SCHEME;
        try {
            DID_SCHEME = await TyronZILUrlScheme.validate(DID);
        } catch (error) {
            throw new SidetreeError(error);
        }

        // Fetches the requested DID:
        console.log(LogColors.green(`Fetching the requested DID-state...`));
        const DID_STATE = await DidState.fetch(DID);
        
        //Validates the update commitment:
        const UPDATE_COMMITMENT = DID_STATE.updateCommitment;
        
        let UPDATE_PRIVATE_KEY;
        try {
            const INPUT_PRIVATE_KEY = readline.question(`Request accepted - Provide your update private key - ` + LogColors.lightBlue(`Your answer: `));
            UPDATE_PRIVATE_KEY = await JsonAsync.parse(Encoder.decodeAsBuffer(INPUT_PRIVATE_KEY));
            const UPDATE_KEY = Cryptography.getPublicKey(UPDATE_PRIVATE_KEY);
            const COMMITMENT = Multihash.canonicalizeThenHashThenEncode(UPDATE_KEY);
            if (UPDATE_COMMITMENT === COMMITMENT) {
                console.log(LogColors.green(`Success! You will be able to update your tyronZIL DID`));
            }
        } catch {
            console.log(LogColors.red(`The client has rejected the given key`));
            return undefined;
        }

        /***            ****            ***/

        // Asks for the specific patch action to update the DID:
        const ACTION = readline.question(`You may choose one of the following actions to update your DID:
         'add-keys'(1),
         'remove-keys'(2),
         'add-services'(3),
         'remove-services'(4) -
         [1/2/3/4] - ` + LogColors.lightBlue(`Your answer: `));
        
        let PATCH_ACTION;
        switch (ACTION) {
            case '1':
                PATCH_ACTION = PatchAction.AddKeys;
                break;
            case '2':
                PATCH_ACTION = PatchAction.RemoveKeys;
                break;
            case '3':
                PATCH_ACTION = PatchAction.AddServices;
                break;
            case '4':
                PATCH_ACTION = PatchAction.RemoveServices;
                break;
            default:
                throw new SidetreeError(ErrorCode.IncorrectPatchAction);
        }

        const ID = [];
        let PUBLIC_KEYS;
        let SERVICE;
        if (PATCH_ACTION === PatchAction.AddKeys) {
            PUBLIC_KEYS = await this.InputKeys();
        } else if (PATCH_ACTION === PatchAction.AddServices) {
            SERVICE = await this.InputService();
        } else if (PATCH_ACTION === PatchAction.RemoveServices) {
            const SERVICE_ID = readline.question(`Provide the ID of the service that you would like to remove - ` + LogColors.lightBlue(`Your answer: `));
            ID.push(SERVICE_ID)
        } else if (PATCH_ACTION === PatchAction.RemoveKeys) {
            const KEY_ID = readline.question(`Provide the ID of the service that you would like to remove - ` + LogColors.lightBlue(`Your answer: `));
            ID.push(KEY_ID)
        }
        const PATCH: PatchModel = {
            action: PATCH_ACTION,
            keyInput: PUBLIC_KEYS,
            service_endpoints: SERVICE,
            ids: ID,
            public_keys: ID
        }

        const UPDATE_INPUT: UpdateOperationInput = {
            did_tyronZIL: DID_SCHEME,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            patch: PATCH,
            didState: DID_STATE
        };

        const DID_EXECUTED = await DidUpdate.execute(UPDATE_INPUT);
        console.log(LogColors.green(`Success! You have updated your tyronZIL DID`));
        /***            ****            ***/

        try{
            await DidState.write(DID_EXECUTED.didState);
        } catch {
            throw new SidetreeError(ErrorCode.CouldNotSave);
        }

        /***            ****            ***/

        /** Resolves the tyronZIL DID into its DID-document */        
        const DID_RESOLVED = await DidDoc.resolve(DID_EXECUTED.didState);
        
        // Saves the DID-document
        try{
            await DidDoc.write(DID_RESOLVED);
        } catch {
            throw new SidetreeError(ErrorCode.CouldNotSave);
        }

        // Saves private keys:
        const PRIVATE_KEYS: PrivateKeys = {
            privateKeys: DID_EXECUTED.privateKey,
            updatePrivateKey: Encoder.encode(Buffer.from(JSON.stringify(DID_EXECUTED.updatePrivateKey))),
        };
        const KEY_FILE_NAME = `NEW_PRIVATE_KEYS_${DID_STATE.did_tyronZIL}.json`;
        fs.writeFileSync(KEY_FILE_NAME, JSON.stringify(PRIVATE_KEYS, null, 2));
        console.info(LogColors.yellow(`Private keys saved as: ${LogColors.brightYellow(KEY_FILE_NAME)}`));
    }

    /** Handles the recover subcommand */
    public static async handleRecover(): Promise<void> {
        // Asks for the DID to recover:
        const DID = readline.question(`Which tyronZIL DID would you like to recover? [tyronZIL DID-scheme] - ` + LogColors.lightBlue(`Your answer: `));
        
        // Validates the DID-scheme
        let DID_SCHEME;
        try {
            DID_SCHEME = await TyronZILUrlScheme.validate(DID);
        } catch (error) {
            throw new SidetreeError(error);
        }

        // Fetches the requested DID:
        console.log(LogColors.green(`Fetching the requested DID-state...`));
        const DID_STATE = await DidState.fetch(DID);
        
        //Validates the recovery commitment:
        const RECOVERY_COMMITMENT = DID_STATE.recoveryCommitment;
        
        const INPUT_PRIVATE_KEY = readline.question(`Request accepted - Provide your recovery private key - ` + LogColors.lightBlue(`Your answer: `));
        const RECOVERY_PRIVATE_KEY = await JsonAsync.parse(Encoder.decodeAsBuffer(INPUT_PRIVATE_KEY));
        const RECOVERY_KEY = Cryptography.getPublicKey(RECOVERY_PRIVATE_KEY);
        const COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);
        if (RECOVERY_COMMITMENT !== COMMITMENT) {
            console.log(LogColors.red(`The client has rejected the given key`));
            return undefined;
        } else {
            console.log(LogColors.green(`Success! You will be able to recover your tyronZIL DID`));

            // Resets the public keys and services:
            const PUBLIC_KEYS = await this.InputKeys();
            const SERVICE = await this.InputService();

            const CLI_INPUT: CliInputModel = {
                network: DID_SCHEME.network,
                publicKeyInput: PUBLIC_KEYS,
                service: SERVICE
            }

            const RECOVERY_INPUT: RecoverOperationInput = {
                did_tyronZIL: DID_SCHEME,
                recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
                cliInput: CLI_INPUT 
            };

            const DID_EXECUTED = await DidRecover.execute(RECOVERY_INPUT);
            
            /***            ****            ***/

            // Builds the new DID-state:
            const DID_NEW_STATE = await DidState.build(DID_EXECUTED);
            
            try{
                await DidState.write(DID_NEW_STATE);
            } catch {
                throw new SidetreeError(ErrorCode.CouldNotSave);
            }

            /***            ****            ***/

            /** Resolves the tyronZIL DID into its DID-document */        
            const DID_RESOLVED = await DidDoc.resolve(DID_NEW_STATE);
            
            // Saves the DID-document
            try{
                await DidDoc.write(DID_RESOLVED);
            } catch {
                throw new SidetreeError(ErrorCode.CouldNotSave);
            }

            /***            ****            ***/

            // Saves private keys:
            const PRIVATE_KEYS: PrivateKeys = {
                privateKeys: DID_EXECUTED.privateKey,
                updatePrivateKey: Encoder.encode(Buffer.from(JSON.stringify(DID_EXECUTED.updatePrivateKey))),
                recoveryPrivateKey: Encoder.encode(Buffer.from(JSON.stringify(DID_EXECUTED.recoveryPrivateKey))),
            };
            const KEY_FILE_NAME = `DID_PRIVATE_KEYS_${DID_STATE.did_tyronZIL}.json`;
            fs.writeFileSync(KEY_FILE_NAME, JSON.stringify(PRIVATE_KEYS, null, 2));
            console.info(LogColors.yellow(`Private keys saved as: ${LogColors.brightYellow(KEY_FILE_NAME)}`));
        }
    }
    /** Handles the deactivate subcommand */
    public static async handleDeactivate(): Promise<void> {
        // Asks for the DID to deactivate:
        const DID = readline.question(`Which tyronZIL DID would you like to deactivate? [tyronZIL DID-scheme] - ` + LogColors.lightBlue(`Your answer: `));
        
        // Validates the DID-scheme
        let DID_SCHEME;
        try {
            DID_SCHEME = await TyronZILUrlScheme.validate(DID);
        } catch (error) {
            throw new SidetreeError(error);
        }

        // Fetches the requested DID:
        console.log(LogColors.green(`Fetching the requested DID-state...`));
        const DID_STATE = await DidState.fetch(DID);
        
        //Validates the recovery commitment:
        const RECOVERY_COMMITMENT = DID_STATE.recoveryCommitment;
        
        let RECOVERY_PRIVATE_KEY;
        try {
            const INPUT_PRIVATE_KEY = readline.question(`Request accepted - To deactivate your DID, provide its recovery private key - ` + LogColors.lightBlue(`Your answer: `));
            RECOVERY_PRIVATE_KEY = await JsonAsync.parse(Encoder.decodeAsBuffer(INPUT_PRIVATE_KEY));
            const RECOVERY_KEY = Cryptography.getPublicKey(RECOVERY_PRIVATE_KEY);
            const COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);
            if (RECOVERY_COMMITMENT === COMMITMENT) {
                console.log(LogColors.green(`Success! Your tyronZIL DID will be deactivated`));
            }
        } catch {
            console.log(LogColors.red(`The client has rejected the given key`));
        }

        /***            ****            ***/

        const DEACTIVATE_INPUT: DeactivateOperationInput = {
            did_tyronZIL: DID_SCHEME,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
        };

        const DID_EXECUTED = await DidDeactivate.execute(DEACTIVATE_INPUT);
        
        /***            ****            ***/

        // Deactivates the DID-state:
        const DID_STATE_OFF = await DidState.deactivate(DID_EXECUTED);
        
        try{
            await DidState.write(DID_STATE_OFF);
        } catch {
            throw new SidetreeError(ErrorCode.CouldNotSave);
        }
    }

    /** Handles the `resolve` subcommand */
    public static async handleResolve(): Promise<void> {
        // Gets the DID to resolve from the user:
        const DID = readline.question(`Which DID would you like to resolve? ` + LogColors.lightBlue(`Your answer: `));
        
        // Validates the DID-scheme
        try {
            await TyronZILUrlScheme.validate(DID);
        } catch (error) {
            throw new SidetreeError(error);
        }

        // Fetches the requested DID-state:
        console.log(LogColors.green(`Fetching the requested DID-state...`));
        const DID_STATE = await DidState.fetch(DID);

        try {
            if (DID_STATE.status === 'deactivate') {
                throw console.log(LogColors.red(`The given DID is deactivated and therefore will not be resolved`)); 
            } else {
                // Creates the requested DID-document and saves it:
                const DID_RESOLVED = await DidDoc.resolve(DID_STATE);
                try{
                    await DidDoc.write(DID_RESOLVED);
                } catch {
                    throw new SidetreeError(ErrorCode.CouldNotSave);
                }
            }
        } catch (error) {
            throw new SidetreeError(ErrorCode.CouldNotResolve)
        }
    }

    /***            ****            ***/

    /** Generates the keys' input */
    public static async InputKeys(): Promise<PublicKeyInput[]> {
        
        // Creates the first verification method used with a general purpose as the primary public key and for authentication as verification relationship:
        console.log(LogColors.green(`Let's create a primary signing key for your DID. It's a general-purpose verification method, also used for authentication as the verification relationship.`));
        
        let PRIMARY_KEY_ID = readline.question(`Choose a name for your key - Defaults to 'primarySigningKey' - ` + LogColors.lightBlue(`Your answer: `));
        if (PRIMARY_KEY_ID === "") {
            PRIMARY_KEY_ID = 'primarySigningKey';
        }

        const PRIMARY_PUBLIC_KEY: PublicKeyInput = {
            id: PRIMARY_KEY_ID,
            purpose: [PublicKeyPurpose.General, PublicKeyPurpose.Auth]
        };
    
        const PUBLIC_KEYS: PublicKeyInput[] = [PRIMARY_PUBLIC_KEY];
    
        // Asks if the user wants a secondary key-pair, and its purpose:
        const MORE_KEYS = readline.question(`Would you like to have a secondary public keys? [y] - Defaults to 'no' - ` + LogColors.lightBlue(`Your answer: `));

        if (MORE_KEYS.toLowerCase() === 'y') {
            let SECONDARY_KEY_ID = readline.question(`Choose a name for your key - Defaults to 'secondarySigningKey' - ` + LogColors.lightBlue(`Your answer: `));
            if (SECONDARY_KEY_ID === "") {
                SECONDARY_KEY_ID = 'secondarySigningKey';
            }

            let SECONDARY_PURPOSE = [PublicKeyPurpose.Auth];
            const WHICH_PURPOSE = readline.question(`What is the secondary purpose: general(1), authentication(2) or both(3)? [1/2/3] - Defaults to authentication - ` + LogColors.lightBlue(`Your answer: `));
            if (WHICH_PURPOSE === '1') {
                SECONDARY_PURPOSE = [PublicKeyPurpose.General]
            } else if (WHICH_PURPOSE === '3') {
                SECONDARY_PURPOSE = [PublicKeyPurpose.General, PublicKeyPurpose.Auth]
            }
            
            const SECONDARY_PUBLIC_KEY: PublicKeyInput = {
                id: SECONDARY_KEY_ID,
                purpose: SECONDARY_PURPOSE
            };
            PUBLIC_KEYS.push(SECONDARY_PUBLIC_KEY);
        }
        
        return PUBLIC_KEYS;
    }

    /***            ****            ***/

    /** Generates the services' input */
    public static async InputService(): Promise<ServiceEndpointModel[]> {
        console.log(LogColors.green(`Let's create service endpoints for your DID!`));
        
        const SERVICE = [];
        
        let WEBSITE_ENDPOINT = readline.question(`Write down your website [https://yourwebsite.com] - Defaults to 'https://tyronZIL.com' - ` + LogColors.lightBlue(`Your answer: `));
        if (WEBSITE_ENDPOINT === "") {
            WEBSITE_ENDPOINT = 'https://tyronZIL.com';
        }
        const SERVICE_WEBSITE: ServiceEndpointModel = {
            id: 'main-website',
            type: 'website',
            endpoint: WEBSITE_ENDPOINT
        }
        SERVICE.push(SERVICE_WEBSITE);

        /** Asks the user for their ZIL address */
        const ADD_ADDRESS = readline.question(`Would you like to add your Zilliqa cryptocurrency address (ZIL)? [y] - Defaults to 'no' - ` + LogColors.lightBlue(`Your answer: `));

        switch (ADD_ADDRESS.toLowerCase()) {
            case 'y': {
                let ADDRESS_ID = readline.question(`Choose a name for your address ID - Defaults to 'ZIL-address' - ` + LogColors.lightBlue(`Your answer: `));
                if (ADDRESS_ID === "") {
                    ADDRESS_ID = 'ZIL-address';
                }
                const ZIL_ADDRESS = readline.question(`What is your ZIL-address? [as bech32 type] - ` + LogColors.lightBlue(`Your answer: `));
            
                const SERVICE_ADDRESS: ServiceEndpointModel = {
                    id: ADDRESS_ID,
                    type: 'ZIL-crypto-address',
                    endpoint: ZIL_ADDRESS
                }
                SERVICE.push(SERVICE_ADDRESS);
                return SERVICE 
            }
            default:
                return SERVICE
        }
    }
}
