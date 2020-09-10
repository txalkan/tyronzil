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

import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import JsonAsync from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/JsonAsync';
import { PatchModel, DocumentModel, PatchAction } from './models/patch-model';
import { PublicKeyModel } from './models/verification-method-models';
import { Cryptography, OperationKeyPairInput } from '../util/did-keys';
import { PublicKeyInput } from '../../../bin/util';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../util/ErrorCode';

export class Sidetree {
    private static async parse(encoded: string): Promise<unknown> {
        const MODEL = JsonAsync.parse(Encoder.decodeBase64UrlAsString(encoded))
        .then(model => { return model })
        .catch(err => { throw err })
        return MODEL;
    }

    public static async suffixModel(encoded: string): Promise<SuffixDataModel|void> {
        const MODEL = await this.parse(encoded)
        .then(model => {
            const SUFFIX_MODEL = model as SuffixDataModel;
            return SUFFIX_MODEL;
        })
        .catch(err => { throw err })
        return MODEL;
    }

    public static async deltaModel(encoded: string): Promise<DeltaModel|void> {
        const MODEL = await this.parse(encoded)
        .then(model => {
            const DELTA_MODEL = model as DeltaModel;
            return DELTA_MODEL;
        })
        .catch(err => { throw err })
        return MODEL;
    }

    public static async documentModel(encoded: string): Promise<DocumentModel|void> {
        const MODEL = await this.parse(encoded)
        .then(model => {
            const DOCUMENT_MODEL = model as DocumentModel;
            return DOCUMENT_MODEL;
        })
        .catch(err => { throw err })
        return MODEL;
    }

    private static async patchesFromDelta(delta: string): Promise<PatchModel[]|void> {
        const PATCHES = await this.deltaModel(delta)
        .then(async delta_model => {
            const DELTA_MODEL = delta_model as DeltaModel;
            const PATCHES = DELTA_MODEL.patches as PatchModel[];
            return PATCHES
        })
        .catch(err => { throw err })
        return PATCHES
    }

    /** Retrieves the DID-document from the encoded delta - Used for the create & recover operations */
    public static async docFromDelta(delta: string): Promise<DocumentModel|void> {
        const DOC_MODEL = await this.patchesFromDelta(delta)
        .then(async patches => {
            const PATCHES = patches as PatchModel[];
            const DOC: DocumentModel = {
                public_keys: [],
                service_endpoints: []
            }
            const RESULT = await this.processPatches(PATCHES, DOC);
            return RESULT.doc;
        })
        .catch(err => { throw err})
        return DOC_MODEL
    }

    public static async processPatches(patches: PatchModel[], doc: DocumentModel)
    : Promise<{ patches: PatchModel[], doc: DocumentModel, privateKey: string[] }> {
        let PUBLIC_KEYS = doc.public_keys;
        const KEY_ID_SET: Set<string> = new Set();
        for(const key of PUBLIC_KEYS) {
            // IDs must be unique
            if(!KEY_ID_SET.has(key.id)) {
                KEY_ID_SET.add(key.id);
            } else {
                throw new SidetreeError(ErrorCode.DocumentPublicKeyIdDuplicated);
            }
        }
        let SERVICES = doc.service_endpoints;
        const SERVICE_ID_SET: Set<string> = new Set();
        for(const service of SERVICES!) {
            // IDs must be unique
            if (SERVICE_ID_SET.has(service.id)) {
              throw new SidetreeError(ErrorCode.DocumentServiceIdDuplicated);
            }
            SERVICE_ID_SET.add(service.id);
        }
        const PATCHES = [];
        const PRIVATE_KEYS: string[] = [];
        
        for(const patch of patches) {
            switch (patch.action) {
                case PatchAction.Replace: {
                    PUBLIC_KEYS = patch.document!.public_keys;
                    SERVICES = patch.document?.service_endpoints;                    
                }
                break;
                case PatchAction.AddKeys: {
                    if(patch.keyInput !== undefined) {
                        await this.addKeys(patch.keyInput!, KEY_ID_SET)
                        .then(new_keys => {
                            PATCHES.push(new_keys.patch);
                            for (const key of new_keys.publicKey) {
                                PUBLIC_KEYS.push(key)
                            }
                            for (const key of new_keys.privateKey) {
                                PRIVATE_KEYS.push(key)
                            }
                        })
                        .catch(err => { throw err })
                    } else {
                        throw new SidetreeError("Missing", "No key in AddKeys patch")
                    }
                }
                break;
                case PatchAction.RemoveKeys:
                    if (patch.public_keys !== undefined) {
                        const ID = patch.public_keys as string[];
                        const key_ids = [];
                        for(const id of ID) {
                            if (typeof id === 'string' && KEY_ID_SET.has(id)) {
                                   key_ids.push(id);
                                } else {
                                    throw new SidetreeError("NotFound", "The key ID does not exist");
                                }
                        }
                        const IDs = new Set(key_ids);
                        PUBLIC_KEYS = PUBLIC_KEYS.filter(key => !IDs.has(key.id));

                        if(PUBLIC_KEYS.length === 0) {
                            throw new SidetreeError("Insufficient", "The DID-document must have at least one public key.")
                        }
                        PATCHES.push({
                            action: PatchAction.RemoveKeys,
                            public_keys: key_ids
                        });
                    }
                break;
                case PatchAction.AddServices: {
                    const SERVICES = patch.service_endpoints;
                    const NEW_SERVICES = [];
                    for(const service of SERVICES!) {
                            if(!SERVICE_ID_SET.has(service.id)) {
                                NEW_SERVICES.push(service)
                                SERVICES!.push(service);
                            }
                    }
                    PATCHES.push({
                        action: PatchAction.AddServices,
                        service_endpoints: NEW_SERVICES
                    })
                }
                break;
                case PatchAction.RemoveServices:
                    if (SERVICES !== undefined && patch.ids !== undefined) {
                        const ID = [];
                        for(const id of patch.ids) {
                            if(!SERVICE_ID_SET.has(id)) {
                                throw new SidetreeError("InvalidID",`The service ID you want to remove does not exist`);
                            } else {
                                ID.push(id)
                            }
                        }
                        PATCHES.push({
                            action: PatchAction.RemoveServices,
                            ids: ID
                        })
                        // Removing the services from the DID-doc
                        const IDs = new Set(ID);
                        SERVICES = SERVICES.filter(service => !IDs.has(service.id))
                    }
                break;
                default:
                    throw new SidetreeError(ErrorCode.IncorrectPatchAction);
            }
        }
        return {
            patches: PATCHES,
            doc: {
                public_keys: PUBLIC_KEYS,
                service_endpoints: SERVICES
            },
            privateKey: PRIVATE_KEYS,
        }
    }

    private static async addKeys(input: PublicKeyInput[], idSet?: Set<string>): Promise<NewKeys> {
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];
        for(let i=0, t= input.length; i<t; ++i) {
            const KEY_INPUT = input[i];

            /** To create the DID public key */
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: KEY_INPUT.id,
                purpose: KEY_INPUT.purpose
            }
            if(idSet?.has(KEY_INPUT.id)) {
                throw new SidetreeError("RepeatedID", "The key ID must be unique.");
            }
            // Creates the DID key-pair:
            const [PUBLIC_KEY, PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            PUBLIC_KEYS.push(PUBLIC_KEY);
            PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(PRIVATE_KEY))));
        }
        const PATCH: PatchModel = {
            action: PatchAction.AddKeys,
            public_keys: PUBLIC_KEYS
        };
        const NEW_KEYS: NewKeys = {
            patch: PATCH,
            publicKey: PUBLIC_KEYS,
            privateKey: PRIVATE_KEYS
        }
        return NEW_KEYS;
        }
}

export interface SuffixDataModel {
    /** The hash  */
    delta_hash: string;
    /** The recovery public key commitment */
    recovery_commitment: string;
}

interface NewKeys {
    patch: PatchModel;
    publicKey: PublicKeyModel[];
    privateKey: string[];
}
