/*
    SSI Protocol's client for Node.js
    Self-Sovereign Identity Protocol.
    Copyright (C) Tyron Pungtas and its affiliates.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/

import * as tyron from 'tyron';
import LogColors from '../bin/log-colors';
import * as readline from 'readline-sync';
import * as fs from 'fs';
import * as util from 'util';
import * as zlib from 'zlib';

/** Tools to manage smart contracts */
export default class SmartUtil {
    /** Encodes the given contract into a Base64URL string to save it into the init.tyron smart contract */
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

    /** Fetches the `DID smart contract` by version & decodes it */
    public static async decode(init: tyron.ZilliqaInit.default, initTyron: string, tyronContract: string, contractVersion: string): Promise<string> {
        const this_contract = await init.API.blockchain.getSmartContractState(initTyron)
        .then(async state => {
            const init = {
                tyronCode: state.result.tyron_code,
            };
            const contracts = Object.entries(init.tyronCode);  
            let tyron_contract;          
            let encoded_contract: string;
            contracts.forEach((value: [string, unknown]) => {
                if (value[0] === tyronContract) {
                    tyron_contract = value[1] as [string, unknown][];
                    tyron_contract.forEach((value: [string, unknown]) => {
                        if (value[0] === contractVersion) {
                            encoded_contract = value[1] as string;
                        }
                    })
                }
            });
            const compressed_contract = Buffer.from(encoded_contract!,'base64');
            const decompressed_contract = await (util.promisify(zlib.unzip))(compressed_contract) as Buffer;
            return decompressed_contract.toString();
        })
        .catch(err => { throw err });
        return this_contract;
    }

    /** Gets the value out of a DID field Option */
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

    /** Gets the DID-Status out of a DID field Option */
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
    public static async getValuefromMap(object: any, key: string): Promise<any> {
        const ENTRIES = Object.entries(object);
        let VALUE;
        ENTRIES.forEach((value: [string, unknown]) => {
            if (value[0] === key) {
                VALUE = value[1]
            }
        });
        return VALUE;
    }

    /** Turns the smart contract's map into a Map */
    public static async intoMap(object: any): Promise<Map<string, any>> {
        const ENTRIES = Object.entries(object);
        let MAP = new Map();
        ENTRIES.forEach((value: [string, unknown]) => {
            MAP.set(value[0], value[1])
        });
        return MAP;
    }

    /** Turns the `DID services` map field into a Map */
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
        return MAP;
    }
}
