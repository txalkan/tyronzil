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

import * as fs from 'fs';
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import { PublicKeyInput } from './cli-input-model';
import { PublicKeyPurpose } from '../lib/decentralized-identity/sidetree-protocol/models/verification-method-models';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';

export default class Util {
    public static async fetch(did: string): Promise<any> {
        const FILE_NAME = `DID_RESOLVED_${did}.json`;
        let OBJECT: any;
        try {
            const FILE = fs.readFileSync(FILE_NAME);
            OBJECT = await JSON.parse(FILE.toString());
        } catch (error) {
            console.log(LogColors.red(`Could not parse the file into an object`));
        }
        return OBJECT;
    }

    /***            ****            ***/

    /** Generates the keys' input */
    public static async InputKeys(): Promise<PublicKeyInput[]> {
        // Creates the first verification method used with a general purpose as the primary public key and for authentication as verification relationship:
        console.log(LogColors.brightGreen(`Let's create a primary signing key for your DID. It's a general-purpose verification method, also used for authentication as the verification relationship.`));
        
        let PRIMARY_KEY_ID = readline.question(LogColors.green(`Choose a name for your key`) + ` - Defaults to 'primarySigningKey' - ` + LogColors.lightBlue(`Your answer: `));
        if (PRIMARY_KEY_ID === "") {
            PRIMARY_KEY_ID = 'primarySigningKey';
        }

        const PRIMARY_PUBLIC_KEY: PublicKeyInput = {
            id: PRIMARY_KEY_ID,
            purpose: [PublicKeyPurpose.General, PublicKeyPurpose.Auth]
        };
    
        const PUBLIC_KEYS: PublicKeyInput[] = [PRIMARY_PUBLIC_KEY];
    
        // Asks if the user wants a secondary key-pair, and its purpose:
        const MORE_KEYS = readline.question(LogColors.green(`Would you like to have a secondary public keys?`) + ` [y] - Defaults to 'no' - ` + LogColors.lightBlue(`Your answer: `));

        if (MORE_KEYS.toLowerCase() === 'y') {
            let SECONDARY_KEY_ID = readline.question(LogColors.green(`Choose a name for your key`) + ` - Defaults to 'secondarySigningKey' - ` + LogColors.lightBlue(`Your answer: `));
            if (SECONDARY_KEY_ID === "") {
                SECONDARY_KEY_ID = 'secondarySigningKey';
            }

            let SECONDARY_PURPOSE = [PublicKeyPurpose.Auth];
            const WHICH_PURPOSE = readline.question(LogColors.green(`What is the secondary purpose: general(1), authentication(2) or both(3)?`) + ` [1/2/3] - Defaults to authentication - ` + LogColors.lightBlue(`Your answer: `));
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
        return PUBLIC_KEYS
    }

    /***            ****            ***/

    /** Generates the services' input */
    public static async InputService(): Promise<ServiceEndpointModel[]> {
        console.log(LogColors.brightGreen(`Let's create service endpoints for your DID!`));
        const SERVICE = [];
        let WEBSITE_ENDPOINT = readline.question(LogColors.green(`Write down your website`) + ` - [https://yourwebsite.com] - Defaults to 'https://tyronZIL.com' - ` + LogColors.lightBlue(`Your answer: `));
        if (WEBSITE_ENDPOINT === "") {
            WEBSITE_ENDPOINT = 'https://tyronZIL.com';
        }
        const SERVICE_WEBSITE: ServiceEndpointModel = {
            id: 'main-website',
            type: 'website',
            endpoint: WEBSITE_ENDPOINT
        }
        SERVICE.push(SERVICE_WEBSITE);
        return SERVICE
    }

    /** Saves the private keys */
    public static async savePrivateKeys(did: string, keys: PrivateKeys): Promise<void> {
        const KEY_FILE_NAME = `DID_PRIVATE_KEYS_${did}.json`;
        fs.writeFileSync(KEY_FILE_NAME, JSON.stringify(keys, null, 2));
        console.info(LogColors.yellow(`Private keys saved as: ${LogColors.brightYellow(KEY_FILE_NAME)}`));
    }
}

export interface PrivateKeys {
    privateKeys?: string[],        //encoded strings
    updatePrivateKey?: string,
    recoveryPrivateKey?: string,
  }
