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

import DidState from './did-state';
import { PublicKeyPurpose, Operation, Recovery, VerificationMethodModel } from './models/verification-method-models';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import { TyronZILUrlScheme } from './tyronZIL-schemes/did-url-scheme';
import * as fs from 'fs';
import LogColors from '../bin/log-colors';

interface DidDocScheme {
    id: string;
    publicKey: VerificationMethodModel[];
    operation: VerificationMethodModel;
    recovery: VerificationMethodModel;
    authentication: (string | VerificationMethodModel)[];
    controller?: string;
    service?: ServiceEndpointModel[];
    created?: number; // MUST be a valid XML datetime value, as defined in section 3.3.7 of [W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes [XMLSCHEMA1.1-2]]. This datetime value MUST be normalized to UTC 00:00, as indicated by the trailing "Z"
    updated?: number; // timestamp of the most recent change
}

/***            ****            ***/

/** Generates a tyronZIL DID document */
export default class DidDoc {
    public readonly id: string;
    public readonly publicKey: VerificationMethodModel[];
    public readonly operation?: VerificationMethodModel;
    public readonly recovery?: VerificationMethodModel;
    public readonly authentication: (string | VerificationMethodModel)[];
    public readonly controller?: string;
    public readonly service?: ServiceEndpointModel[];

    private constructor (
        operationOutput: DidDocScheme
    ) {
        this.id = operationOutput.id;
        this.publicKey = operationOutput.publicKey;
        this.operation = operationOutput.operation;
        this.recovery = operationOutput.recovery;
        this.authentication = operationOutput.authentication;
        this.controller = operationOutput.controller;
        this.service = operationOutput.service;
    }

    /***            ****            ***/

    /** Saves the DID-document */
    public static async write(input: DidDoc): Promise<void> {
        const PRINT_STATE = JSON.stringify(input, null, 2);
        const FILE_NAME = `DID_DOCUMENT_${input.id}.json`;
        fs.writeFileSync(FILE_NAME, PRINT_STATE);
        console.info(LogColors.yellow(`DID-document saved as: ${LogColors.brightYellow(FILE_NAME)}`));
    }

    /** Resolves any tyronZIL DID-state into its DID-document */
    public static async resolve(input: DidState): Promise<DidDoc> {
        
        /** Validates tyronZIL's DID-scheme */
        const DID_SCHEME = await TyronZILUrlScheme.validate(input.did_tyronZIL)
        const ID: string = DID_SCHEME.did_tyronZIL;

        /***            ****            ***/
        /** Reads the public keys */
        const PUBLIC_KEYS = input.publicKey;
        const PUBLIC_KEY = [];
        const AUTHENTICATION = [];

        if (Array.isArray(PUBLIC_KEYS)) {
            for (const key of PUBLIC_KEYS) {

                /** The key ID */
                const DID_URL: string = ID + '#' + key.id;
                const VERIFICATION_METHOD: VerificationMethodModel = {
                    id: DID_URL,
                    type: key.type,
                    publicKeyJwk: key.publicKeyJwk
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
        const SERVICE_INTERFACE = input.service;
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

        /***            ****            ***/

        /** The verification method operation */
        const VM_OPERATION: Operation = Object.assign({}, input.operation);
        delete VM_OPERATION.purpose;

        /** The verification method recovery */
        const VM_RECOVERY: Recovery = Object.assign({}, input.recovery);
        delete VM_RECOVERY.purpose;

        /***            ****            ***/

        /** The tyronZIL DID-document */
        const OPERATION_OUTPUT: DidDocScheme = {
            id: ID,
            publicKey: PUBLIC_KEY,
            operation: VM_OPERATION,
            recovery: VM_RECOVERY,
            authentication: AUTHENTICATION
        };
         
        if (SERVICES.length !== 0) {
            OPERATION_OUTPUT.service = SERVICES;
        }

        return new DidDoc(OPERATION_OUTPUT);
    }
}