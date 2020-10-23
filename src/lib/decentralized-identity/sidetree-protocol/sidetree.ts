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
import { PatchModel, DocumentModel, PatchAction } from './models/document-model';
import { PrivateKeyModel, PublicKeyModel, PublicKeyPurpose } from './models/verification-method-models';
import { Cryptography, OperationKeyPairInput, TyronPublicKeys } from '../util/did-keys';
import ErrorCode from '../util/ErrorCode';

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

    public static async processPatches(patches: PatchModel[], doc: DocumentModel)
    : Promise<{ patches: PatchModel[], doc: DocumentModel, privateKeys: PrivateKeyModel[] }> {
        let PUBLIC_KEYS = doc.public_keys as TyronPublicKeys;
        const KEY_IDS = Object.keys(PUBLIC_KEYS)
        const KEY_ID_SET: Set<string> = new Set();

        for(const id of KEY_IDS) {
            // IDs must be unique
            if(!KEY_ID_SET.has(id)) {
                KEY_ID_SET.add(id);
            } else {
                throw new ErrorCode("KeyDuplicated", "The key ID must be unique");
            }
        }

        let SERVICES = doc.service_endpoints!;
        const SERVICE_ID_SET: Set<string> = new Set();
        if(SERVICES === undefined) {
            SERVICES = []
        } else if(SERVICES.length > 0) {
            for(const service of SERVICES) {
                // IDs must be unique
                if(!SERVICE_ID_SET.has(service.id)) {
                    SERVICE_ID_SET.add(service.id);
                } else {
                    throw new ErrorCode("ServiceDuplicated", "There are services with the same ID");
                }
            }
        }
        
        const PATCHES = [];
        let PRIVATE_KEYS: any;
        let NEW_PUBLIC_KEYS;
        
        for(const patch of patches) {
            switch (patch.action) {
                case PatchAction.AddKeys: 
                    if(patch.keyInput !== undefined) {
                        await this.addKeys(patch.keyInput, KEY_ID_SET)
                        .then(async new_keys => {
                            PATCHES.push(new_keys.patch);
                            NEW_PUBLIC_KEYS = await Cryptography.processKeys(new_keys.publicKeys);
                            Object.assign(PUBLIC_KEYS, NEW_PUBLIC_KEYS);
                            PRIVATE_KEYS = new_keys.privateKeys;
                        })
                        .catch(err => { throw err })
                    } else {
                        throw new ErrorCode("Missing", "No key in AddKeys patch")
                    }
                    break;
                case PatchAction.RemoveKeys:
                    if (patch.public_keys !== undefined) {
                        const ID = patch.public_keys as string[];
                        const key_ids = [];
                        for(const id of ID) {
                            if(typeof id === 'string' && KEY_ID_SET.has(id)) {
                                   key_ids.push(id);
                                   KEY_ID_SET.delete(id);
                                } else {
                                    throw new ErrorCode("NotFound", "The key ID does not exist");
                                }
                        }

                        for(const id of key_ids) {
                            switch (id) {
                                case PublicKeyPurpose.General:
                                    delete PUBLIC_KEYS.general;               
                                    break;
                                case PublicKeyPurpose.Auth:
                                    delete PUBLIC_KEYS.authentication
                                    break;
                                case PublicKeyPurpose.Assertion:
                                    delete PUBLIC_KEYS.assertion;
                                    break;
                                case PublicKeyPurpose.Agreement:
                                    delete PUBLIC_KEYS.agreement;
                                    break;
                                case PublicKeyPurpose.Invocation:
                                    delete PUBLIC_KEYS.invocation;
                                    break;
                                case PublicKeyPurpose.Delegation:
                                    delete PUBLIC_KEYS.delegation;
                                    break;
                                case PublicKeyPurpose.XSGD:
                                    delete PUBLIC_KEYS.xsgd;
                                    break;
                                default:
                                    throw new ErrorCode("InvalidID", `The client detected an invalid key ID`);
                            }
                        }
                        PATCHES.push({
                            action: PatchAction.RemoveKeys,
                            public_keys: key_ids
                        });
                    }
                    break;
                case PatchAction.AddServices: 
                    if (patch.service_endpoints !== undefined) {
                        const NEW_SERVICES = [];
                        for(const service of patch.service_endpoints) {
                            if(!SERVICE_ID_SET.has(service.id)) {
                                SERVICES.push(service);
                                NEW_SERVICES.push(service)
                            } else {
                                throw new ErrorCode("ServiceDuplicated", "There are services with the same ID")
                            }
                        }
                        PATCHES.push({
                            action: PatchAction.AddServices,
                            service_endpoints: NEW_SERVICES
                        })
                    } else {
                        throw new ErrorCode("Missing", "No services given to add")
                    }
                    break;
                case PatchAction.RemoveServices:
                    if(patch.ids !== undefined) {
                        const ID = [];
                        for(const id of patch.ids) {
                            if(!SERVICE_ID_SET.has(id)) {
                                throw new ErrorCode("NotFound",`The service ID you want to remove does not exist`);
                            } else {
                                ID.push(id);
                                SERVICE_ID_SET.delete(id)
                            }
                        }
                        PATCHES.push({
                            action: PatchAction.RemoveServices,
                            ids: ID
                        })
                        // Removing the services from the DID-Doc
                        const IDs = new Set(ID);
                        SERVICES = SERVICES.filter(service => !IDs.has(service.id))
                    } else {
                        throw new ErrorCode("Missing", "No service ID given to remove")
                    }
                    break;
                default:
                    throw new ErrorCode("CodeIncorrectPatchAction", "The chosen action is not valid");
            }
        }
        return {
            patches: PATCHES,
            doc: {
                public_keys: PUBLIC_KEYS,
                service_endpoints: SERVICES
            },
            privateKeys: PRIVATE_KEYS,
        }
    }

    private static async addKeys(input: PublicKeyInput[], idSet: Set<string>): Promise<NewKeys> {
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];
        for(let i=0, t= input.length; i<t; ++i) {
            const KEY_INPUT = input[i];

            /** To create the DID public key */
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: KEY_INPUT.id
            }
            if(idSet.has(KEY_INPUT.id)) {
                throw new ErrorCode("KeyDuplicated", "The key ID must be unique");
            }
            // Creates the DID key-pair:
            const [PUBLIC_KEY, PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            PUBLIC_KEYS.push(PUBLIC_KEY);
            PRIVATE_KEYS.push(PRIVATE_KEY);
        }
        const PATCH: PatchModel = {
            action: PatchAction.AddKeys,
            public_keys: PUBLIC_KEYS
        };
        const NEW_KEYS: NewKeys = {
            patch: PATCH,
            publicKeys: PUBLIC_KEYS,
            privateKeys: PRIVATE_KEYS
        }
        return NEW_KEYS;
        }
}

/***            ** interfaces **            ***/

/** Keys generated by the DID-Update operation */
interface NewKeys {
    patch: PatchModel;
    publicKeys: PublicKeyModel[];
    privateKeys: PrivateKeyModel[];
}
