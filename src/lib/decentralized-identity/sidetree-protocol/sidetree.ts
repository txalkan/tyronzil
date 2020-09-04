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
import { PublicKeyInput } from '../../../bin/cli-input-model';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../util/ErrorCode';

export class Sidetree {
    private static async parse(encoded: string): Promise<any> {
        const MODEL = JsonAsync.parse(Encoder.decodeBase64UrlAsString(encoded))
        .then(model => { return model })
        .catch(err => console.error(err))
        return MODEL;
    }

    public static async suffixModel(encoded: string): Promise<SuffixDataModel|void> {
        const MODEL = await this.parse(encoded)
        .then(model => {
            const SUFFIX_MODEL = model as SuffixDataModel;
            return SUFFIX_MODEL;
        })
        .catch(err => console.error(err))
        return MODEL
    }

    public static async deltaModel(encoded: string): Promise<DeltaModel|void> {
        const MODEL = await this.parse(encoded)
        .then(model => {
            const DELTA_MODEL = model as DeltaModel;
            return DELTA_MODEL;
        })
        .catch(err => console.error(err))
        return MODEL
    }

    public static async documentModel(encoded: string): Promise<DocumentModel|void> {
        const MODEL = await this.parse(encoded)
        .then(model => {
            const DOCUMENT_MODEL = model as DocumentModel;
            return DOCUMENT_MODEL;
        })
        .catch(err => console.error(err))
        return MODEL
    }

    /** Gets the Sidetree document-model from the DID State Patches */
    private static async getDocument(patches: PatchModel[]): Promise<DocumentModel|void> {
        for(const patch of patches) {
            if(patch.document !== undefined && patch.action === PatchAction.Replace) {
                const DOCUMENT = patch.document;
                return DOCUMENT as DocumentModel;
            }
        }
    }

    public static async patchesFromDelta(delta: string): Promise<PatchModel[]|void> {
        const PATCHES = await this.deltaModel(delta)
        .then(async delta_model => {
            const DELTA_MODEL = delta_model as DeltaModel;
            const PATCHES = DELTA_MODEL.patches as PatchModel[];
            return PATCHES
        })
        .catch(err => console.error(err))
        return PATCHES
    }

    public static async docFromDelta(delta: string): Promise<DocumentModel|void> {
        const DOC_MODEL = await this.patchesFromDelta(delta)
        .then(async patches => {
            const DOCUMENT = await this.getDocument(patches as PatchModel[]);
            return DOCUMENT as DocumentModel
        })
        .catch(err => console.error(err))
        return DOC_MODEL
    }

    public static async processPatches(patches: PatchModel[], doc: DocumentModel)
    : Promise<{ patches: PatchModel[], doc: DocumentModel, privateKey: string[]}> {
        const PUBLIC_KEYS = doc.public_keys;
        const PATCHES = [];
        const PRIVATE_KEYS = [];
        for(const patch of patches) {
            /** Maps the public keys to their IDs */
            const KEY_MAP = new Map(PUBLIC_KEYS.map(publicKey => [publicKey.id, publicKey]));
            switch (patch.action) {
                case PatchAction.AddKeys: {
                    const KEYS = patch.keyInput;
                    if(KEYS !== undefined) {
                        const ADD_KEYS = await this.addKeys(KEYS);
                        PATCHES.push(ADD_KEYS.patch);
                        
                        if (Array.isArray(ADD_KEYS.publicKey)) {
                            for (const key of ADD_KEYS.publicKey) {
                                PUBLIC_KEYS?.push(key)
                            }
                        }

                        if (Array.isArray(ADD_KEYS.privateKey)) {
                            for (const key of ADD_KEYS.privateKey) {
                                PRIVATE_KEYS.push(key)
                            }
                        }
                    }
                }
                break;
                case PatchAction.AddServices: {
                    const SERVICES = patch.service_endpoints;
                    if (SERVICES !== undefined) {
                        PATCHES.push({
                            action: PatchAction.AddServices,
                            service_endpoints: patch.service_endpoints
                        })
                        for (const service of SERVICES) {
                            doc.service_endpoints?.push(service)
                        }
                    }
                }
                break;
                case PatchAction.RemoveServices:
                    if (doc.service_endpoints !== undefined && patch.ids !== undefined) {
                        PATCHES.push({
                            action: PatchAction.RemoveServices,
                            ids: patch.ids
                        })
                        
                        /** IDs of the services to remove */
                        const IDs = new Set(patch.ids);
                        doc.service_endpoints = doc.service_endpoints.filter(service => !IDs.has(service.id))
                    }
                break;
                case PatchAction.RemoveKeys:
                    if (patch.public_keys !== undefined) {
                        PATCHES.push({
                            action: PatchAction.RemoveKeys,
                            public_keys: patch.public_keys
                        });
                        const ID = patch.public_keys;
                        for(const id of ID) {
                            if (typeof id === 'string') {
                                const KEY = KEY_MAP.get(id);
                                if (KEY !== undefined) {
                                    KEY_MAP.delete(id)
                                }
                            }
                        }
                        for(const value of KEY_MAP.values()){
                            PUBLIC_KEYS.push(value)
                        }
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
                service_endpoints: doc.service_endpoints
            },
            privateKey: PRIVATE_KEYS,
        }
    }

    private static async addKeys(input: PublicKeyInput[]): Promise<NewKeys> {
        const PUBLIC_KEYS = [];
        const PRIVATE_KEYS = [];

        const PRIMARY_KEY_INPUT = input[0];

        /** To create the DID primary public key */
        const KEY_PAIR_INPUT: OperationKeyPairInput = {
            id: PRIMARY_KEY_INPUT.id,
            purpose: PRIMARY_KEY_INPUT.purpose
        }
        // Creates DID primary key-pair:
        const [PRIMARY_KEY, PRIMARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
        PUBLIC_KEYS.push(PRIMARY_KEY);
        PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(PRIMARY_PRIVATE_KEY))));

        if (input.length === 2) {
            const SECONDARY_KEY_INPUT = input[1];
            
            /** To create the DID secondary public key */
            const KEY_PAIR_INPUT: OperationKeyPairInput = {
                id: SECONDARY_KEY_INPUT.id,
                purpose: SECONDARY_KEY_INPUT.purpose
            }
            // Creates DID secondary key-pair:
            const [SECONDARY_KEY, SECONDARY_PRIVATE_KEY] = await Cryptography.operationKeyPair(KEY_PAIR_INPUT);
            PUBLIC_KEYS.push(SECONDARY_KEY);
            PRIVATE_KEYS.push(Encoder.encode(Buffer.from(JSON.stringify(SECONDARY_PRIVATE_KEY))));
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
