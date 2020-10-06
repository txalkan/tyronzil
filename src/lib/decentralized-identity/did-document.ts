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

import ZilliqaInit from '../blockchain/zilliqa-init';
import { DidServiceEndpointModel } from './sidetree-protocol/models/document-model';
import { PublicKeyPurpose, VerificationMethodModel } from './sidetree-protocol/models/verification-method-models';
import { NetworkNamespace } from './tyronZIL-schemes/did-scheme';
import DidUrlScheme from './tyronZIL-schemes/did-url-scheme';
import DidState from './did-state';
import ErrorCode from './util/ErrorCode';
import * as fs from 'fs';
import LogColors from '../../bin/log-colors';

export enum Accept {
    contentType = "application/did+json",        //requests a DID-Document as output
    Result = "application/did+json;profile='https://w3c-ccg.github.io/did-resolution'"        //requests a DID-Resolution-Result as output
}

/** Generates a `Tyron DID-Document` */
export default class DidDoc {
    public readonly id: string;
    public readonly publicKey: VerificationMethodModel[];
    public readonly authentication?: (string | VerificationMethodModel)[];
    public readonly service?: DidServiceEndpointModel[];

    private constructor (
        operationOutput: DidDocScheme
    ) {
        this.id = operationOutput.id;
        this.publicKey = operationOutput.publicKey;
        this.authentication = operationOutput.authentication;
        this.service = operationOutput.service;
    }

    /***            ****            ***/

    /** The `Tyron DID-Resolution` method */
    public static async resolution(network: NetworkNamespace, tyronAddr: string, input: ResolutionInput): Promise<ResolutionResult|DidDoc> {
        const ACCEPT = input.metadata.accept;
        const DID = input.did;
        const ZIL_INIT = new ZilliqaInit(network);
        const BLOCKCHAIN_INFO = await ZIL_INIT.API.blockchain.getBlockChainInfo();        
        const DID_RESOLVED = await DidState.fetch(network, tyronAddr)
        .then(async did_state => {
            if(did_state.decentralized_identifier !== DID){
                throw new ErrorCode("CodeDidMismatch", "The given DID does not match the contract's decentralized identifier")
            }
            const DID_DOC = await DidDoc.read(did_state);
                switch (ACCEPT) {
                    case Accept.contentType:
                        return DID_DOC;
                    case Accept.Result:
                        {
                            const RESOLUTION_RESULT: ResolutionResult = {
                                resolutionMetadata: BLOCKCHAIN_INFO,
                                document: DID_DOC,
                                metadata: {
                                    contentType: "application/did+json",
                                    updateKey: did_state.did_update_key,
                                    recoveryKey: did_state.did_recovery_key,
                                }
                            }
                            return RESOLUTION_RESULT;
                        }
                }
        })
        .catch(err => { throw err })
        return DID_RESOLVED;
    }

    /***            ****            ***/

    /** Generates a 'Tyron DID-Read' operation, resolving any `Tyron DID-state` into its DID-Document */
    public static async read(state: DidState): Promise<DidDoc> {
        const DID_DOC = await DidUrlScheme.validate(state.decentralized_identifier)
        .then(async did_scheme => {
            const ID = did_scheme.did;
            
            /** Reads the public keys */
            const PUBLIC_KEYS = state.did_document.public_keys;
            const PUBLIC_KEY = [];
            const AUTHENTICATION = [];

            if(Array.isArray(PUBLIC_KEYS)) {
                for(const key of PUBLIC_KEYS) {
                    /** The key ID */
                    const DID_URL: string = ID + '#' + key.id;
                    const VERIFICATION_METHOD: VerificationMethodModel = {
                        id: DID_URL,
                        type: key.type,
                        publicKeyBase58: key.publicKeyBase58
                    };

                    /** The verification relationship for the key */
                    const PURPOSE: Set<string> = new Set(key.purpose);

                    if (PURPOSE.has(PublicKeyPurpose.General)) {
                        PUBLIC_KEY.push(VERIFICATION_METHOD);
                        // If the key is also for authentication => referenced key:
                        if (PURPOSE.has(PublicKeyPurpose.Auth)) {
                            AUTHENTICATION.push(DID_URL); 
                        }
                    
                        // If the key is only for authentication => embedded key
                    } else if (PURPOSE.has(PublicKeyPurpose.Auth)) {
                        AUTHENTICATION.push(VERIFICATION_METHOD); 
                    }
                }
            }

            /***            ****            ***/

            /** Service property */
            const services = state.did_document.service_endpoints;
            const SERVICES = [];
            if(services !== undefined) {            
                if (Array.isArray(services)) {
                    for (const service of services) {
                        const SERVICE: DidServiceEndpointModel = {
                            id: ID + '#' + service.id,
                            type: service.type,
                            endpoint: service.endpoint
                        };
                        SERVICES.push(SERVICE);
                    }
                }
            }

            /** The `Tyron DID-Document` */
            const OPERATION_OUTPUT: DidDocScheme = {
                id: ID,
                publicKey: PUBLIC_KEY
            };
            if(AUTHENTICATION.length !== 0) {
                OPERATION_OUTPUT.authentication = AUTHENTICATION;
            }
            if(SERVICES.length !== 0) {
                OPERATION_OUTPUT.service = SERVICES;
            }
            return new DidDoc(OPERATION_OUTPUT);
        })
        .catch(err => { throw err })
        return DID_DOC;
    }

    /***            ****            ***/

    /** Saves the `Tyron DID-Document` */
    public static async write(did: string, input: DidDoc | ResolutionResult): Promise<void> {
        try {
            const PRINT_STATE = JSON.stringify(input, null, 2);
            let FILE_NAME;
            if(input instanceof DidDoc) {
                FILE_NAME = `DID_DOCUMENT_${did}.json`;        
            } else {
                FILE_NAME = `DID_RESOLVED_${did}.json`;
            }
            fs.writeFileSync(FILE_NAME, PRINT_STATE);
            console.info(LogColors.yellow(`DID resolved as: ${LogColors.brightYellow(FILE_NAME)}`));
        } catch (error) {
            throw new ErrorCode("CodeCouldNotSave", "The DID file did not get saved");            
        }
    }
}

/***            ** interfaces **            ***/

/** The scheme of a `Tyron DID-Document` */
interface DidDocScheme {
    id: string;
    publicKey: VerificationMethodModel[];
    authentication?: (string | VerificationMethodModel)[];
    service?: DidServiceEndpointModel[];
    created?: number; //MUST be a valid XML datetime value, as defined in section 3.3.7 of [W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes [XMLSCHEMA1.1-2]]. This datetime value MUST be normalized to UTC 00:00, as indicated by the trailing "Z"
    updated?: number; //timestamp of the most recent change
}

export interface ResolutionInput {
    did: string;
    metadata: ResolutionInputMetadata;
}

export interface ResolutionInputMetadata {
    accept: Accept;        //to request a certain type of result
    versionId?: string;        //to request a specific version of the DID-Document - mutually exclusive with versionTime
    versionTime?: string;        //idem versionId - an RFC3339 combined date and time representing when the DID-Doc was current for the input DID
    noCache?: boolean;        //to request a certain kind of caching behavior - 'true': caching is disabled and a fresh DID-Doc is retrieved from the registry
    dereferencingInput?: DereferencingInputMetadata;
}

interface DereferencingInputMetadata {
    serviceType?: string;        //to select a specific service from the DID-Document
    followRedirect?: boolean;        //to instruct whether redirects should be followed
}

export interface ResolutionResult {
    resolutionMetadata: unknown;
    document: DidDoc;
    metadata: DocumentMetadata;
}

interface DocumentMetadata {
    contentType: string;
    updateKey: string;
    recoveryKey: string;
}
