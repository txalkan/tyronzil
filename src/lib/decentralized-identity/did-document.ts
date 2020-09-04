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

import { NetworkNamespace } from './tyronZIL-schemes/did-scheme';
import DidState from './did-state';
import { PublicKeyPurpose, VerificationMethodModel } from './sidetree-protocol/models/verification-method-models';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { TyronZILUrlScheme } from './tyronZIL-schemes/did-url-scheme';
import * as fs from 'fs';
import LogColors from '../../bin/log-colors';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from './util/ErrorCode';

/** Generates a tyronZIL DID document */
export default class DidDoc {
    public readonly id: string;
    public readonly publicKey: VerificationMethodModel[];
    public readonly authentication: (string | VerificationMethodModel)[];
    public readonly service?: ServiceEndpointModel[];

    private constructor (
        operationOutput: DidDocScheme
    ) {
        this.id = operationOutput.id;
        this.publicKey = operationOutput.publicKey;
        this.authentication = operationOutput.authentication;
        this.service = operationOutput.service;
    }

    /***            ****            ***/

    /** Saves the DID-document */
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
            throw new SidetreeError(ErrorCode.CouldNotSave);            
        }
    }

    /***            ****            ***/

    /** Generates a 'DID-read' operation, resolving any tyronZIL DID-state into its DID-document */
    public static async read(input: DidState): Promise<DidDoc> {
        /** Validates tyronZIL's DID-scheme */
        let ID;
        try {
            const DID_SCHEME = await TyronZILUrlScheme.validate(input.did_tyronZIL);
            ID = DID_SCHEME.did_tyronZIL;
        } catch (error) {
            throw new SidetreeError(ErrorCode.InvalidDID);
        }

        /***            ****            ***/

        /** Reads the public keys */
        const PUBLIC_KEYS = input.document!.public_keys;
        const PUBLIC_KEY = [];
        const AUTHENTICATION = [];

        if (Array.isArray(PUBLIC_KEYS)) {
            for (const key of PUBLIC_KEYS) {
                /** The key ID */
                const DID_URL: string = ID + '#' + key.id;
                const VERIFICATION_METHOD: VerificationMethodModel = {
                    id: DID_URL,
                    type: key.type,
                    jwk: key.jwk
                };

                /** The verification relationship for the key */
                const PURPOSE: Set<string> = new Set(key.purpose);

                if (PURPOSE.has(PublicKeyPurpose.General)) {
                    PUBLIC_KEY.push(VERIFICATION_METHOD);
                    
                    // The authentication property
                    // referenced key:
                    if (PURPOSE.has(PublicKeyPurpose.Auth)) {
                        AUTHENTICATION.push(DID_URL); 
                    }
                
                // embedded key, when is not a general key
                } else if (PURPOSE.has(PublicKeyPurpose.Auth)) {
                    AUTHENTICATION.push(VERIFICATION_METHOD); 
                }
            }
        }

        /***            ****            ***/

        /** Service property */
        const SERVICE_INTERFACE = input.document?.service_endpoints;
        const SERVICES = [];
        
        if (Array.isArray(SERVICE_INTERFACE)) {
            for (const service of SERVICE_INTERFACE) {
                const SERVICE: ServiceEndpointModel = {
                    id: ID + '#' + service.id,
                    type: service.type,
                    endpoint: service.endpoint
                };
                SERVICES.push(SERVICE);
            }
        }

        /** The tyronZIL DID-document */
        const OPERATION_OUTPUT: DidDocScheme = {
            id: ID,
            publicKey: PUBLIC_KEY,
            authentication: AUTHENTICATION
        };
         
        if (SERVICES.length !== 0) {
            OPERATION_OUTPUT.service = SERVICES;
        }
        return new DidDoc(OPERATION_OUTPUT);
    }

    /***            ****            ***/

    /** The tyronZIL DID resolution function */
    public static async resolution(network: NetworkNamespace, tyronAddr: string, input: ResolutionInput): Promise<ResolutionResult | DidDoc | void> {
        const ACCEPT = input.metadata.accept;
        const DID_tyronZIL = input.did;
        const DID_RESOLVED = await DidState.fetch(network, tyronAddr)
        .then(async did_state => {
            const DID_STATE = did_state as DidState;
            if(DID_STATE.did_tyronZIL !== DID_tyronZIL){
                throw new SidetreeError(ErrorCode.DidMismatch)
            }
            const DID_DOC = await DidDoc.read(DID_STATE);
            switch (ACCEPT) {
                case Accept.contentType:
                    return DID_DOC;
                case Accept.Result: {
                    const RESOLUTION_RESULT: ResolutionResult = {
                        document: DID_DOC,
                        metadata: {
                            updateCommitment: DID_STATE.updateCommitment,
                            recoveryCommitment: DID_STATE.recoveryCommitment,
                        }
                    }
                    return RESOLUTION_RESULT;
                }
            }
        })
        .catch(err => console.error(err))
        return DID_RESOLVED;
    }
}

/***            ****            ***/

/** The scheme of a `tyron-did-document` */
interface DidDocScheme {
    id: string;
    publicKey: VerificationMethodModel[];
    authentication: (string | VerificationMethodModel)[];
    service?: ServiceEndpointModel[];
    created?: number; //MUST be a valid XML datetime value, as defined in section 3.3.7 of [W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes [XMLSCHEMA1.1-2]]. This datetime value MUST be normalized to UTC 00:00, as indicated by the trailing "Z"
    updated?: number; //timestamp of the most recent change
}

export interface ResolutionInput {
    did: string;
    metadata: ResolutionInputMetadata;
}

export interface ResolutionInputMetadata {
    accept: Accept;        //to request a certain type of result
    versionId?: string;        //to request a specific version of the DID-document - mutually exclusive with versionTime
    versionTime?: string;        //idem versionId - an RFC3339 combined date and time representing when the DID-doc was current for the input DID
    noCache?: boolean;        //to request a certain kind of caching behavior - 'true': caching is disabled and a fresh DID-doc is retrieved from the registry
    dereferencingInput?: DereferencingInputMetadata;
}

interface DereferencingInputMetadata {
    serviceType?: string;        //to select a specific service from the DID-document
    followRedirect?: boolean;        //to instruct whether redirects should be followed
}

export enum Accept {
    contentType = "application/did+json",        //requests a DId-document as output
    Result = "application/did+json;profile='https://w3c-ccg.github.io/did-resolution'"        //requests a DID resolution result as output
}

export interface ResolutionResult {
    resolutionMetadata?: unknown;
    document: DidDoc;
    metadata: DocumentMetadata;
}

interface DocumentMetadata {
    updateCommitment: string | undefined;        //both commitments are undefined after deactivation
    recoveryCommitment: string | undefined;
}
