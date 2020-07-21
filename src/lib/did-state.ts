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
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import DocumentModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel';

export interface DidStateModel {
    document: DocumentModel;
    updateCommitment: string | undefined;
    recoverCommitment: string | undefined;
    lastTransactionNumber?: number;    
}

export default class DidState {

    /** Fetches the current state for the given DID */
    
    public static async fetch (did_tyronZIL: string) {
        const fileName = `../../DB/did-states/${did_tyronZIL}-didState.json`;

        let didStateFile;
        try {
            didStateFile = require(fileName);
        } catch (error) {
            console.log(error);
        }
        
        const DID_STATE = await JsonAsync.parse(didStateFile);
        
        const properties = Object.keys(DID_STATE);
        if (properties.length !== 4) {
            console.log(`ERROR reading the file`)
        }
        




    }
    /** Applies the new state to the given DID */
    //public static async applyCreate() {}
//}