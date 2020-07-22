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
import { CLICreateInput, PublicKeyInput } from '../lib/models/cli-create-input-model';
import TyronZILScheme from '../lib/tyronZIL-schemes/did-scheme';
import { NetworkNamespace, SchemeInputData } from '../lib/tyronZIL-schemes/did-scheme';
import * as readline from 'readline-sync';
import { PublicKeyPurpose } from '../lib/models/verification-method-models';
import { LongFormDidInput, TyronZILUrlScheme } from '../lib/tyronZIL-schemes/did-url-scheme';
import DidState, { DidStateModel } from '../lib/did-state';
import * as fs from 'fs';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../lib/ErrorCode';
import DidDoc from '../lib/did-document';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
//import { read } from 'fs'; */

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

        const INPUT: CLICreateInput = {
            network: NETWORK,
            publicKeyInput: PUBLIC_KEYS
        }

        const DID_CREATED = await DidCreate.executeCli(INPUT);
        const DID_SUFFIX = DID_CREATED.didUniqueSuffix;
        
        const SCHEME_DATA: SchemeInputData = {
            network: NETWORK,
            didUniqueSuffix: DID_SUFFIX
        };
        
        const TYRON_SCHEME = await TyronZILScheme.newDID(SCHEME_DATA);
        const DID_tyronZIL = TYRON_SCHEME.did_tyronZIL;
        
        console.log(LogColors.green(`Your decentralized identity on Zilliqa is: `) + LogColors.brightGreen(`${TYRON_SCHEME.did_tyronZIL}`));     
        
        const PUBLIC_KEY = JSON.stringify(DID_CREATED.publicKey, null, 2);
        console.log(`Your public key(s): ${PUBLIC_KEY}`);

        // Generates the Sidetree Long-Form DID
        if (DID_CREATED.encodedDelta !== undefined) {
            const LONG_DID_INPUT: LongFormDidInput = {
                schemeInput: SCHEME_DATA,
                encodedSuffixData: DID_CREATED.encodedSuffixData,
                encodedDelta: DID_CREATED.encodedDelta
            }

            const LONG_FORM_DID = await TyronZILUrlScheme.longFormDid(LONG_DID_INPUT);

            const LONG_DID_tyronZIL = LONG_FORM_DID.longFormDid;

            console.log(LogColors.green(`The corresponding Sidetree Long-Form DID is: `) + `${LONG_DID_tyronZIL}`);
        }

        // Writes the DID-state:
        const DID_STATE_MODEL: DidStateModel = {
            did_tyronZIL: DID_tyronZIL,
            publicKey: DID_CREATED.publicKey,
            operation: DID_CREATED.operation,
            recovery: DID_CREATED.recovery,
            service: DID_CREATED.service,
        }

        const DID_STATE = await DidState.write(DID_STATE_MODEL);
        const PRINT_STATE = JSON.stringify(DID_STATE, null, 2);

        // Saves the DID-state:
        const FILE_NAME = `${DID_tyronZIL}-DID_STATE.json`;
        fs.writeFileSync(FILE_NAME, PRINT_STATE);
        console.info(LogColors.yellow(`DID-state saved as: ${LogColors.brightYellow(FILE_NAME)}`));

        // Creates the corresponding DID-document and saves it
        const DID_RESOLVED = await DidDoc.resolve(DID_CREATED, NETWORK);
        const DOC_STRING = await DidDoc.stringify(DID_RESOLVED);
        const DID_DOC = await await JsonAsync.parse(DOC_STRING);
        const PRINT_DOC = JSON.stringify(DID_DOC, null, 2);

        const DOC_NAME = `${DID_tyronZIL}-DID_DOCUMENT.json`;
        fs.writeFileSync(DOC_NAME, PRINT_DOC);
        console.info(LogColors.yellow(`DID-document saved as: ${LogColors.brightYellow(DOC_NAME)}`));
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
        const SERVICE = JSON.stringify(DID_CREATED.serviceEndpoints);
        console.log(`& your service endpoints are: ${SERVICE}`);
        
        const TYRONZIL_DOCUMENT = await DidDoc.make(DID_CREATED);
        const DOC_STRING = JSON.stringify(TYRONZIL_DOCUMENT);
        console.log(`& youR DID-document is: ${DOC_STRING}`);

        const THIS_TRANSACTION_NUMBER = 1; // to-do fetch from blockchain

        const DID_STATE_INPUT: DidStateModel = {
            document: TYRONZIL_DOCUMENT,
            nextRecoveryCommitmentHash: DID_CREATED.recoveryCommitment,
            nextUpdateCommitmentHash: DID_CREATED.updateRevealValue,
            lastOperationTransactionNumber: THIS_TRANSACTION_NUMBER,
        };
        /*
        const DID_STATE = await DID_STATE.applyCreate(DID_STATE_INPUT);
        */
    }
