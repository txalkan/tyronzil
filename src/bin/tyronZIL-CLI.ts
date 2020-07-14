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
import DidDoc from '../lib/did-document';

//import tyronDocument from '../src/did-document';


/** Defines the tyronZIL DID scheme */
interface DidScheme {
    schemeIdentifier: string;
    methodName: string;
    methodNamespace: string;
    methodSpecificId: string;
}

/** Handles the tyronZIL CLI DID operations */
export default class TyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate(): Promise<void> {
        const DID_CREATED = await DidCreate.execute();
        const DID_SUFFIX = DID_CREATED.didSuffix;
        const TYRONZIL_SCHEME: DidScheme = {
            schemeIdentifier:'did:',
            methodName: 'tyron:',
            methodNamespace: 'zil:',
            methodSpecificId: DID_SUFFIX,
        }
        console.log(`Your decentralized digital identity on Zilliqa is: ` + LogColors.green(`${TYRONZIL_SCHEME.schemeIdentifier}${TYRONZIL_SCHEME.methodName}`) + LogColors.lightBlue(`${TYRONZIL_SCHEME.methodNamespace}`) + LogColors.brightYellow(`${TYRONZIL_SCHEME.methodSpecificId}`));
        
        const PUBLIC_KEY = JSON.stringify(DID_CREATED.signingKeys);
        console.log(`& your public key is: ${PUBLIC_KEY}`);
        
        const SERVICE = JSON.stringify(DID_CREATED.serviceEndpoints);
        console.log(`& your service endpoints are: ${SERVICE}`);
        
        const TYRONZIL_DOCUMENT = await DidDoc.new();
        const DOC_STRING = JSON.stringify(TYRONZIL_DOCUMENT);
        console.log(`& youR DID-document is: ${DOC_STRING}`);
    }

}