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

import * as API from '@zilliqa-js/zilliqa';
import { InitTyron } from '../tyronzil';
import LogColors from '../../../bin/log-colors';
import * as readline from 'readline-sync';
import * as fs from 'fs';
import * as util from 'util';
import * as zlib from 'zlib';

/** Tools to manage smart contracts */
export default class SmartUtil {
    /** Encodes the given contract into a Base64URL string to save it into the `init.tyron` smart contract */
    public static async encode(): Promise<void> {
        const contractName = readline.question(LogColors.green(`What is the name of the contract that you'd like to encode? - `) + LogColors.lightBlue(`Your answer: `));
        try {
            const CONTRACT_STRING = (fs.readFileSync(`src/lib/blockchain/smart-contracts/${contractName}.scilla`)).toString();
            const COMPRESSED_CONTRACT = await (util.promisify(zlib.gzip))(CONTRACT_STRING) as Buffer;
            console.log(COMPRESSED_CONTRACT.toString('base64'));
            console.log(`The size of the compressed smart-contract is: ${COMPRESSED_CONTRACT.byteLength}`)
        } catch (error) {
            console.error(error)
        }
    }

    /** Fetches the `Tyron DID-Smart-Contract` by version & decodes it */
    public static async decode(api: API.Zilliqa, initTyron: InitTyron, contractVersion: string): Promise<string> {
        const INIT_TYRON = initTyron as string;
        const THIS_CONTRACT = await api.blockchain.getSmartContractState(INIT_TYRON)
        .then(async STATE => {
            const INIT = {
                didcCode: STATE.result.didc_code,
            };
            const CONTRACTS = Object.entries(INIT.didcCode);            
            let ENCODED_CONTRACT: string;
            CONTRACTS.forEach((value: [string, unknown]) => {
                if (value[0] === contractVersion) {
                    ENCODED_CONTRACT = value[1] as string;
                }
            });
            
            const COMPRESSED_CONTRACT = Buffer.from(ENCODED_CONTRACT!,'base64');
            const DECOMPRESSED_CONTRACT = await (util.promisify(zlib.unzip))(COMPRESSED_CONTRACT) as Buffer;
            return DECOMPRESSED_CONTRACT.toString();
        })
        .catch(err => { throw err });
        return THIS_CONTRACT;
    }

    /** Gets the value out of a DIDC field Option */
    public static async getValue(object: any): Promise<string> {
        const ENTRIES = Object.entries(object);
        let VALUE: string;
        ENTRIES.forEach((value: [string, unknown]) => {
            if (value[0] === "arguments") {
                VALUE = value[1] as string;
            }
        });
        return VALUE![0];
    }

    /** Gets the DID-Status out of a DIDC field Option */
    public static async getStatus(object: any): Promise<string> {
        const ENTRIES = Object.entries(object);
        let VALUE: string;
        ENTRIES.forEach((value: [string, unknown]) => {
            if (value[0] === "constructor") {
                VALUE = value[1] as string;
            }
        });
        return VALUE!;
    }

    /** Gets the value out of a map key */
    public static async getValuefromMap(object: any, key: string): Promise<string> {
        const ENTRIES = Object.entries(object);
        let VALUE: string;
        ENTRIES.forEach((value: [string, unknown]) => {
            if (value[0] === key) {
                VALUE = value[1] as string;
            }
        });
        return VALUE![0];
    }

    /** Turns the smart contract's map into a Map */
    public static async intoMap(object: any): Promise<Map<string, any>> {
        const ENTRIES = Object.entries(object);
        let MAP = new Map();
        ENTRIES.forEach((value: [string, unknown]) => {
            MAP.set(value[0], value[1])
        });
        console.log(MAP);
        return MAP;
    }

    /** Turns the `services` DIDC's map into a Map */
    public static async fromServices(object: any): Promise<Map<string, [string, string]>> {
        const PREV_MAP = await this.intoMap(object);
        let MAP = new Map();
        
        for (let id of PREV_MAP.keys()) {
            const OBJECT = PREV_MAP.get(id);
            const ENTRIES = Object.entries(OBJECT);
            
            ENTRIES.forEach((value: [string, unknown]) => {
                if (value[0] === "arguments") {
                    const VALUE = value[1] as [string, string];
                    const TYPE = VALUE[0];
                    const URI = VALUE[1];
                    MAP.set(id, [TYPE, URI]);
                }
            });

        };
        console.log(MAP);
        return MAP;
    }
}
