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
import { VerificationMethodInput } from '../lib/did-operations/did-create';

import TyronZILScheme from '../lib/tyronZIL-scheme';
import { NetworkNamespace, DidData } from '../lib/tyronZIL-scheme';
import * as readline from 'readline-sync';
import PublicKeyPurpose from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/PublicKeyPurpose';

/*
import DidDoc from '../lib/did-document';
import DidStateModel from '@decentralized-identity/sidetree/dist/lib/core/models/DidState';
import { read } from 'fs'; */

/** Handles the command-line interface DID operations */
export default class TyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate(): Promise<void> {
        // Gets network choice from the user:
        const network = readline.question('On which Zilliqa network do you want to create your tyronZIL DID, mainnet(m) or testnet(t)? [m/t] ');
        
        if (network.toLowerCase() !== 'm' && network.toLowerCase() !== 't') {
            console.log('Invalid answer! Thus, using testnet as default.');
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
        console.log(`Let's create your primary public key! It's a general-purpose verification method, also used for authentication as verification relationship.`);
        
        let PRIMARY_KEY_ID = readline.question(`What is the key ID? Defaults to 'primarySigningKey' `);
        if (PRIMARY_KEY_ID === "") {
            PRIMARY_KEY_ID = 'primarySigningKey';
        }

        const PRIMARY_VERIFICATION_METHOD: VerificationMethodInput = {
            id: PRIMARY_KEY_ID,
            purpose: [PublicKeyPurpose.General, PublicKeyPurpose.Auth]
        };
    
        const VERIFICATION_METHODS: VerificationMethodInput[] = [PRIMARY_VERIFICATION_METHOD];
    
        // Asks if the user wants a secondary key-pair, and its purpose:
        const MORE_KEYS = readline.question(`Would you like to have a secondary public keys? [y] - Defaults to 'no' `);

        if (MORE_KEYS.toLowerCase() === 'y') {
            let SECONDARY_KEY_ID = readline.question(`What is the key ID? Defaults to 'secondarySigningKey' `);
            if (SECONDARY_KEY_ID === "") {
                SECONDARY_KEY_ID = 'secondarySigningKey';
            }

            let SECONDARY_PURPOSE = [PublicKeyPurpose.Auth];
            const WHICH_PURPOSE = readline.question('What is the secondary purpose: general(1), authentication(2) or both(3)? [1/2/3] - Defaults to authentication. ');
            if (WHICH_PURPOSE === '1') {
                SECONDARY_PURPOSE = [PublicKeyPurpose.General]
            } else if (WHICH_PURPOSE === '3') {
                SECONDARY_PURPOSE = [PublicKeyPurpose.General, PublicKeyPurpose.Auth]
            }
            
            const SECONDARY_VERIFICATION_METHOD: VerificationMethodInput = {
                id: SECONDARY_KEY_ID,
                purpose: SECONDARY_PURPOSE
            };
            VERIFICATION_METHODS.push(SECONDARY_VERIFICATION_METHOD);
        }

        const DID_CREATED = await DidCreate.executeCli(VERIFICATION_METHODS);
        const DID_SUFFIX = DID_CREATED.didUniqueSuffix;
        
        const DID_DATA: DidData = {
            network: NETWORK,
            didUniqueSuffix: DID_SUFFIX
        };
        
        const DID_tyronZIL = await TyronZILScheme.newDID(DID_DATA);
        
        console.log(`Your decentralized identity on Zilliqa is: ` + LogColors.green(`${DID_tyronZIL.schemeIdentifier}${DID_tyronZIL.methodName}`) + LogColors.lightBlue(`${DID_tyronZIL.blockchain}${DID_tyronZIL.network}`) + LogColors.brightYellow(`${DID_tyronZIL.didUniqueSuffix}`));
        
        const PUBLIC_KEY = JSON.stringify(DID_CREATED.signingKeys);
        console.log(`Your public key(s): ${PUBLIC_KEY}`);
        
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

}