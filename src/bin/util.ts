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
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';

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
        console.log(LogColors.brightGreen(`Cryptographic keys for your Decentralized Identifier: `))
        const amount = readline.question(LogColors.green(`How many keys would you like to have? - `) + LogColors.lightBlue(`Your answer: `));
        if(!Number(amount)){
            throw new SidetreeError("WrongAmount", "It must be a number");
        }
        const KEYS = [];
        for(let i=0, t= Number(amount); i<t; ++i) {
            const id = readline.question(LogColors.green(`Write down your key ID - `) + LogColors.lightBlue(`Your answer: `));
            if (id === "") {
                throw new SidetreeError("InvalidID", `To register a key you must provide its ID`);
            }
            const purpose = readline.question(LogColors.green(`What is the key purpose: general(1), authentication(2) or both(3)?`) + ` [1/2/3] - Defaults to authentication - ` + LogColors.lightBlue(`Your answer: `));
            let PURPOSE;
            switch (Number(purpose)) {
                case 1:
                    PURPOSE = [PublicKeyPurpose.General];
                    break;
                case 3:
                    PURPOSE = [PublicKeyPurpose.General, PublicKeyPurpose.Auth];
                    break;
                default:
                    PURPOSE = [PublicKeyPurpose.Auth];
                    break;
            }
            const KEY: PublicKeyInput = {
                id: id,
                purpose: PURPOSE
            }
            KEYS.push(KEY);
        }
        return KEYS;
    }

    /***            ****            ***/

    /** Generates the services' input */
    public static async InputService(): Promise<ServiceEndpointModel[]> {
        console.log(LogColors.brightGreen(`Service endpoints for your Decentralized Identifier:`));
        const SERVICE = [];
        const amount = readline.question(LogColors.green(`How many service endpoints would you like to have? - `) + LogColors.lightBlue(`Your answer: `));
        if(!Number(amount)){
            throw new SidetreeError("WrongAmount", "It must be a number");
        }
        for(let i=0, t= Number(amount); i<t; ++i) {
            const id = readline.question(LogColors.green(`Write down your service ID - `) + LogColors.lightBlue(`Your answer: `));
            const type = readline.question(LogColors.green(`Write down your service type - `) + ` - [e.g. website] - ` + LogColors.lightBlue(`Your answer: `));
            const endpoint = readline.question(LogColors.green(`Write down your service URL - `) + ` - [https://yourwebsite.com] - ` + LogColors.lightBlue(`Your answer: `));
            if (id === "" || endpoint === "" || type === "") {
                throw new SidetreeError("Invalid parameter", "To register a service-endpoint you must provide its ID, type and URL");
            }
            const SERVICE_ENDPOINT: ServiceEndpointModel = {
                id: id,
                type: type,
                endpoint: endpoint
            }
            SERVICE.push(SERVICE_ENDPOINT);
        }
        return SERVICE;
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
