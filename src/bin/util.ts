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
import * as fs from 'fs';
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import { Action, DataTransferProtocol, DocumentElement, ServiceModel } from '../lib/decentralized-identity/protocols/models/document-model';
import { PublicKeyPurpose } from '../lib/decentralized-identity/protocols/models/verification-method-models';
import { NetworkNamespace } from '../lib/decentralized-identity/tyronZIL-schemes/did-scheme';
import ErrorCode from '../lib/decentralized-identity/util/ErrorCode';
import { TyronPrivateKeys } from '../lib/decentralized-identity/util/did-keys';
import TyronZIL, { TransitionValue } from '../lib/blockchain/tyronzil';

export default class Util {

    /** Generates the keys' input */
    public static async InputKeys(): Promise<PublicKeyInput[]> {
        console.log(LogColors.brightGreen(`Cryptographic keys for your Decentralized Identifier: `))
        
        const KEY_ID_SET: Set<string> = new Set();
        const KEY_INPUT = [];
        
        console.log(LogColors.brightGreen(`You can have a key for each of the following purposes:
        $xSGD stablecoin(0),
        General(1),
        Authentication(2),
        Assertion(3),
        Agreement(4),
        Invocation(5), &
        Delegation(6)`));

        const amount = readline.question(LogColors.green(`How many of them would you like to add?`) + ` - up to [7] - ` + LogColors.lightBlue(`Your answer: `));
        if(Number(amount)> 6) {
            throw new ErrorCode("IncorrectAmount", "You may only have up to 7 keys, one for each purpose")
        }
        for(let i=0, t= Number(amount); i<t; ++i) {
            const id = readline.question(LogColors.green(`Next, choose your key purpose`) + ` - [0/1/2/3/4/5/6] - ` + LogColors.lightBlue(`Your answer: `));
            if (id === "") {
                throw new ErrorCode("InvalidID", `To register a key you must provide a valid purpose`);
            }
            let PURPOSE;
            switch (Number(id)) {
                case 0:
                    PURPOSE = PublicKeyPurpose.XSGD;
                    break;
                case 1:
                    PURPOSE = PublicKeyPurpose.General;
                    break;
                case 2:
                    PURPOSE = PublicKeyPurpose.Auth;
                    break;
                case 3:
                    PURPOSE = PublicKeyPurpose.Assertion;
                    break;
                case 4:
                    PURPOSE = PublicKeyPurpose.Agreement;
                    break;
                case 5:
                    PURPOSE = PublicKeyPurpose.Invocation;
                    break;
                case 6:
                    PURPOSE = PublicKeyPurpose.Delegation;
                    break;
                default:
                    throw new ErrorCode("InvalidID", `To register a key you must provide a valid purpose`);
            }
            const KEY: PublicKeyInput = {
                id: PURPOSE
            }

            // IDs MUST be unique
            if(KEY_ID_SET.has(id)) {
                throw new ErrorCode("DuplicatedID", "The key IDs MUST NOT be duplicated");
            }
            KEY_ID_SET.add(id);
            KEY_INPUT.push(KEY);
        }
        return KEY_INPUT;
    }

    /***            ****            ***/

    /** Generates the DID services */
    public static async services(): Promise<TransitionValue[]> {
        console.log(LogColors.brightGreen(`Service endpoints for your Decentralized Identifier:`));
        const SERVICES: TransitionValue[] = [];
        const SERVICE_ID_SET: Set<string> = new Set();
        
        const amount = readline.question(LogColors.green(`How many services would you like to add? - `) + LogColors.lightBlue(`Your answer: `));
        if(!Number(amount) && Number(amount) !== 0 || Number(amount) < 0) {
            throw new ErrorCode("WrongAmount", "It must be a number greater than or equal to 0");
        }
        for(let i=0, t= Number(amount); i<t; ++i) {
            const id = readline.question(LogColors.green(`What is the service ID? - `) + LogColors.lightBlue(`Your answer: `));
            const type = readline.question(LogColors.green(`What is the service type? - `) + ` - Defaults to 'website' - ` + LogColors.lightBlue(`Your answer: `));
            const data_transfer = readline.question(LogColors.green(`What is the data transfer protocol? https(1), git(2) or ssh(3)`) + ` - [1/2/3] - ` + LogColors.lightBlue(`Your answer: `));
            let DATA_TRANSFER;
            switch (Number(data_transfer)) {
                case 1:
                    DATA_TRANSFER = DataTransferProtocol.Https;
                    break;
                case 2:
                    DATA_TRANSFER = DataTransferProtocol.Git;
                    break;
                case 3:
                    DATA_TRANSFER = DataTransferProtocol.Ssh;
                    break;
                default:
                    throw new ErrorCode("InvalidInput", `That input in not allowed`);
            }
            const endpoint = readline.question(LogColors.green(`What is the service URI?`) + ` - [www.yourwebsite.com] - ` + LogColors.lightBlue(`Your answer: `));
            if (id === "" || endpoint === "") {
                throw new ErrorCode("Invalid parameter", "To register a service-endpoint you must provide its ID, type and URL");
            }
            let TYPE;
            if(type !== "") {
                TYPE = type;
            } else {
                TYPE = "website"
            }

            // IDs MUST be unique
            if(!SERVICE_ID_SET.has(id)) {
                SERVICE_ID_SET.add(id);
                const SERVICE: ServiceModel = {
                    id: id,
                    type: TYPE,
                    transferProtocol: DATA_TRANSFER,
                    uri: endpoint
                };
                const DOC_ELEMENT = await TyronZIL.documentElement(
                    DocumentElement.Service,
                    Action.Adding,
                    undefined,
                    SERVICE
                );
                SERVICES.push(DOC_ELEMENT);
            } else {            
                throw new ErrorCode("CodeDocumentServiceIdDuplicated", "The service IDs MUST NOT be duplicated" );
            }
        }
        return SERVICES;
    }

    /** Saves the private keys */
    public static async savePrivateKeys(did: string, keys: TyronPrivateKeys): Promise<void> {
        const KEY_FILE_NAME = `DID_PRIVATE_KEYS_${did}.json`;
        fs.writeFileSync(KEY_FILE_NAME, JSON.stringify(keys, null, 2));
        console.info(LogColors.yellow(`Private keys saved as: ${LogColors.brightYellow(KEY_FILE_NAME)}`));
    }

    /** Verifies that the given key matches the DID-Key of the DIDC (did_update_key OR did_recovery_key) */
    public static async verifyKey(privateKey: string, didKey: string): Promise<void> {
        const PUB_KEY = "0x"+ zcrypto.getPubKeyFromPrivateKey(privateKey);
        if(PUB_KEY === didKey) {
            console.log(LogColors.brightGreen(`Success! The private key corresponds to the public did_key stored in the DIDC`));
        } else {
            throw new ErrorCode("WrongKey", "The given key is not matching the corresponding key in the DIDC")
        }
    }
}

/***            ** interfaces **            ***/

export interface CliInputModel {
    network: NetworkNamespace;
    publicKeyInput: PublicKeyInput[];
    services: TransitionValue[];
    userPrivateKey?: string;
}
  
export interface PublicKeyInput {
    id: PublicKeyPurpose;
}
