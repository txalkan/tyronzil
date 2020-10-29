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

import { PublicKeyInput } from '../../../bin/util';
import LogColors from '../../../bin/log-colors';
import { PatchModel, DocumentModel, PatchAction, Action, DataTransferProtocol, DocumentElement, ServiceModel } from './models/document-model';
import { PrivateKeyModel, PublicKeyModel } from './models/verification-method-models';
import { Cryptography, OperationKeyPairInput } from '../util/did-keys';
import ErrorCode from '../util/ErrorCode';
import TyronZIL, { TransitionValue } from '../../blockchain/tyronzil';

/** Operation types */
export enum OperationType {
    Create = "Created",
    Recover = "Recovered",
    Update = "Updated",
    Deactivate = "Deactivated"
}

export class Sidetree {
    public static async documentModel(encoded: string): Promise<DocumentModel> {
        try {
            const STRING = Buffer.from(encoded, 'hex').toString();
            const DOC = JSON.parse(STRING);
            console.log(LogColors.brightGreen("The DID-Document (Sidetree-Document-Model format):"))
            console.log(JSON.stringify(DOC, null, 2));
            
            const DOCUMENT: DocumentModel = {
                public_keys: DOC.public_keys
            }
            if(DOC.service_endpoints !== undefined && DOC.service_endpoints.length !== 0) {
                    DOCUMENT.service_endpoints = DOC.service_endpoints;
            }
            return DOCUMENT;
        } catch (err) {
            throw err
        }
    }

    public static async processPatches(patches: PatchModel[])
    : Promise<{ updateDocument: any[], privateKeys: PrivateKeyModel[] }> {
        let UPDATE_DOCUMENT: TransitionValue[] = [];
        let PRIVATE_KEYS: PrivateKeyModel[] = [];
        
        for(const patch of patches) {
            switch (patch.action) {
                case PatchAction.AddKeys: 
                    if(patch.keyInput !== undefined) {
                        await this.addKeys(patch.keyInput)
                        .then(async new_keys => {
                            UPDATE_DOCUMENT.concat(new_keys.publicKeys);
                            PRIVATE_KEYS = new_keys.privateKeys;
                        })
                        .catch(err => { throw err })
                    } else {
                        throw new ErrorCode("Missing", "No key in AddKeys patch")
                    }
                    break;
                case PatchAction.RemoveKeys:
                    if(patch.ids !== undefined) {
                        const KEYS_TO_REMOVE: TransitionValue[] = [];
                        for(const id of patch.ids) {
                            const KEY: PublicKeyModel = {
                                id: id
                            };
                            const DOC_ELEMENT = await TyronZIL.documentElement(
                                DocumentElement.VerificationMethod,
                                Action.Removing,
                                KEY
                            );
                            KEYS_TO_REMOVE.push(DOC_ELEMENT);
                        }
                        UPDATE_DOCUMENT.concat(KEYS_TO_REMOVE);
                    }
                    break;
                case PatchAction.AddServices: 
                    if (patch.services !== undefined) {
                        UPDATE_DOCUMENT.concat(patch.services)
                    } else {
                        throw new ErrorCode("Missing", "No services given to add")
                    }
                    break;
                case PatchAction.RemoveServices:
                    if(patch.ids !== undefined) {
                        const SERVICES_TO_REMOVE: TransitionValue[] = [];
                        for(const id of patch.ids) {
                            const SERVICE: ServiceModel = {
                                id: id,
                                type: "",
                                transferProtocol: DataTransferProtocol.Https,
                                uri: ""
                            };
                            const DOC_ELEMENT = await TyronZIL.documentElement(
                                DocumentElement.Service,
                                Action.Removing,
                                undefined,
                                SERVICE
                            );
                            SERVICES_TO_REMOVE.push(DOC_ELEMENT);
                        }
                        UPDATE_DOCUMENT.concat(SERVICES_TO_REMOVE);
                    } else {
                        throw new ErrorCode("Missing", "No service ID given to remove")
                    }
                    break;
                default:
                    throw new ErrorCode("CodeIncorrectPatchAction", "The chosen action is not valid");
            }
        }
        return {
            updateDocument: UPDATE_DOCUMENT,
            privateKeys: PRIVATE_KEYS,
        }
    }

    private static async addKeys(input: PublicKeyInput[]): Promise<NewKeys> {
        const VERIFICATION_METHODS = [];
        const PRIVATE_KEYS = [];
        for(let i=0, t= input.length; i<t; ++i) {
            const KEY_INPUT = input[i];

            /** To create the DID public key */
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: KEY_INPUT.id
            }
            
            // Creates the key pair:
            const [VERIFICATION_METHOD, PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            VERIFICATION_METHODS.push(VERIFICATION_METHOD);
            PRIVATE_KEYS.push(PRIVATE_KEY);
        }
        const NEW_KEYS: NewKeys = {
            publicKeys: VERIFICATION_METHODS,
            privateKeys: PRIVATE_KEYS
        }
        return NEW_KEYS;
        }
}

/***            ** interfaces **            ***/

/** Keys generated by the DID-Update operation */
interface NewKeys {
    publicKeys: any[];
    privateKeys: PrivateKeyModel[];
}
