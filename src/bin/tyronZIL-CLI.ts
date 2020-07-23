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
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../lib/ErrorCode';
import DidDoc from '../lib/did-document';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { PrivateKeys, Cryptography} from '../lib/did-keys';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';

/** Handles the command-line interface DID operations */
export default class TyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate(): Promise<void> {
        // Gets network choice from the user:
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
        const DID_SUFFIX = DID_EXECUTED.didUniqueSuffix;
        
        const SCHEME_DATA: SchemeInputData = {
            network: NETWORK,
            didUniqueSuffix: DID_SUFFIX
        };
        
        // Generates the DID-scheme:
        const TYRON_SCHEME = await TyronZILScheme.newDID(SCHEME_DATA);
        const DID_tyronZIL = TYRON_SCHEME.did_tyronZIL;
        
        console.log(LogColors.green(`Your decentralized identity on Zilliqa is: `) + LogColors.brightGreen(`${TYRON_SCHEME.did_tyronZIL}`));     
        
        // Generates the Sidetree Long-Form DID
        if (DID_EXECUTED.encodedDelta !== undefined) {
            const LONG_DID_INPUT: LongFormDidInput = {
                schemeInput: SCHEME_DATA,
                encodedSuffixData: DID_EXECUTED.encodedSuffixData,
                encodedDelta: DID_EXECUTED.encodedDelta
            }

            const LONG_FORM_DID = await TyronZILUrlScheme.longFormDid(LONG_DID_INPUT);

            const LONG_DID_tyronZIL = LONG_FORM_DID.longFormDid;

            console.log(LogColors.green(`The corresponding Sidetree Long-Form DID is: `) + `${LONG_DID_tyronZIL}`);
        }

        /***            ****            ***/

        // Builds the DID-state:
        const DID_STATE = await DidState.build(DID_EXECUTED);
        
        try{
            await DidState.write(DID_STATE);
        } catch {
            throw new SidetreeError(ErrorCode.CouldNotSaveState);
        }
        
        /***            ****            ***/

        // Creates the corresponding DID-document and saves it
        const DID_RESOLVED = await DidDoc.resolve(DID_EXECUTED, NETWORK);
        const DOC_STRING = await DidDoc.stringify(DID_RESOLVED);
        const DID_DOC = await JsonAsync.parse(DOC_STRING);
        const PRINT_DOC = JSON.stringify(DID_DOC, null, 2);

        const DOC_NAME = `${DID_tyronZIL}-DID_DOCUMENT.json`;
        fs.writeFileSync(DOC_NAME, PRINT_DOC);
        console.info(LogColors.yellow(`DID-document saved as: ${LogColors.brightYellow(DOC_NAME)}`));

        /***            ****            ***/

        // Saves private keys:
        const PRIVATE_KEYS: PrivateKeys = {
            privateKeys: DID_EXECUTED.privateKey,
            updatePrivateKey: Encoder.encode(Buffer.from(JSON.stringify(DID_EXECUTED.updatePrivateKey))),
            recoveryPrivateKey: Encoder.encode(Buffer.from(JSON.stringify(DID_EXECUTED.recoveryPrivateKey))),
        };
        const KEY_FILE_NAME = `${DID_tyronZIL}-PRIVATE_KEYS.json`;
        fs.writeFileSync(KEY_FILE_NAME, JSON.stringify(PRIVATE_KEYS, null, 2));
        console.info(LogColors.yellow(`Private keys saved as: ${LogColors.brightYellow(KEY_FILE_NAME)}`));
    }

    /** Handles the recover subcommand */
    public static async handleRecover(): Promise<void> {
        // Asks for the DID to recover:
        const DID = readline.question(`Which tyronZIL DID would you like to recover? [TyronZILScheme] - ` + LogColors.lightBlue(`Your answer: `));
        
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
        const RECOVERY_COMMITMENT = DID_STATE.recoveryCommitment;
        
        let RECOVERY_PRIVATE_KEY;
        try {
            const INPUT_PRIVATE_KEY = readline.question(`Request accepted - Provide your recovery private key - ` + LogColors.lightBlue(`Your answer: `));
            RECOVERY_PRIVATE_KEY = await JsonAsync.parse(Encoder.decodeAsBuffer(INPUT_PRIVATE_KEY));
            const RECOVERY_KEY = Cryptography.getPublicKey(RECOVERY_PRIVATE_KEY);
            const COMMITMENT = Multihash.canonicalizeThenHashThenEncode(RECOVERY_KEY);
            if (RECOVERY_COMMITMENT === COMMITMENT) {
                console.log(LogColors.green(`Success! You will be able to recover your tyronZIL DID`));
            }
        } catch {
            console.log(LogColors.red(`The client has rejected the given key`));
        }

        /***            ****            ***/
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

        // Builds the DID-state:
        const DID_NEW_STATE = await DidState.build(DID_EXECUTED);
        
        try{
            await DidState.write(DID_NEW_STATE);
        } catch {
            throw new SidetreeError(ErrorCode.CouldNotSaveState);
        }

    }

    /** Handles the `resolve` subcommand */
    public static async handleResolve(): Promise<void> {
        // Gets the DID to resolve from the user:
        const DID = readline.question(`Which DID would you like to resolve? ` + LogColors.lightBlue(`Your answer: `));
        
        
        //let PROPER_DID = undefined;
        try {
            //PROPER_DID = 
            await TyronZILUrlScheme.validate(DID);
        } catch {
            throw new SidetreeError(ErrorCode.DidInvalidUrl);
        }
    }
        // Resolve the DID into its DID-document
    
    


        
        /* 
        const SERVICE = JSON.stringify(DID_EXECUTED.serviceEndpoints);
        console.log(`& your service endpoints are: ${SERVICE}`);
        
        const TYRONZIL_DOCUMENT = await DidDoc.make(DID_EXECUTED);
        const DOC_STRING = JSON.stringify(TYRONZIL_DOCUMENT);
        console.log(`& youR DID-document is: ${DOC_STRING}`);

        const THIS_TRANSACTION_NUMBER = 1; // to-do fetch from blockchain

        const DID_STATE_INPUT: DidStateModel = {
            document: TYRONZIL_DOCUMENT,
            nextRecoveryCommitmentHash: DID_EXECUTED.recoveryCommitment,
            nextUpdateCommitmentHash: DID_EXECUTED.updateRevealValue,
            lastOperationTransactionNumber: THIS_TRANSACTION_NUMBER,
        };
        /*
        const DID_STATE = await DID_STATE.applyCreate(DID_STATE_INPUT);

        */
    public static async InputKeys(): Promise<PublicKeyInput[]> {
        
        // Creates the first verification method used with a general purpose as the primary public key and for authentication as verification relationship:
        console.log(LogColors.green(`Let's create your primary public key! It's a general-purpose verification method, also used for authentication as the verification relationship.`));
        
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

    public static async InputService(): Promise<ServiceEndpointModel[]> {
        console.log(LogColors.green(`Now, let's create your service endpoints!`));
        
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

        // Asks the user for their ZIL address:
        const ADD_ADDRESS = readline.question(`Would you like to add your Zilliqa cryptocurrency address (ZIL)? [y] - Defaults to 'no' - ` + LogColors.lightBlue(`Your answer: `));

        if (ADD_ADDRESS.toLowerCase() === 'y') {
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
        }
        return SERVICE;
    }
}
