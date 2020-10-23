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

import * as zcrypto from '@zilliqa-js/crypto';
import ZilliqaInit from '../blockchain/zilliqa-init';
import { DidServiceEndpointModel } from './sidetree-protocol/models/document-model';
import { PublicKeyPurpose, TyronVerificationMethods, VerificationMethodModel } from './sidetree-protocol/models/verification-method-models';
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
    public readonly publicKey?: VerificationMethodModel;
    public readonly authentication?: VerificationMethodModel;
    public readonly assertionMethod?: VerificationMethodModel;
    public readonly keyAgreement?: VerificationMethodModel;
    public readonly capabilityInvocation?: VerificationMethodModel;
    public readonly capabilityDelegation?: VerificationMethodModel;
    public readonly xsgdKey?: VerificationMethodModel;
    public readonly service?: DidServiceEndpointModel[];

    private constructor (
        scheme: DidDocScheme
    ) {
        this.id = scheme.id;
        this.publicKey = scheme.verificationMethods!.publicKey;
        this.authentication = scheme.verificationMethods!.authentication;
        this.assertionMethod = scheme.verificationMethods!.assertionMethod;
        this.keyAgreement = scheme.verificationMethods!.keyAgreement;
        this.capabilityInvocation = scheme.verificationMethods!.capabilityDelegation;
        this.xsgdKey = scheme.verificationMethods!.xsgdKey;
        this.service = scheme.service;
    }

    /***            ****            ***/

    /** The `Tyron DID-Resolution` method */
    public static async resolution(network: NetworkNamespace, input: ResolutionInput): Promise<DidDoc|ResolutionResult> {
        const ACCEPT = input.metadata.accept;
        const ZIL_INIT = new ZilliqaInit(network);

        const BLOCKCHAIN_INFO = await ZIL_INIT.API.blockchain.getBlockChainInfo();
        let RESOLUTION_RESULT;

        const DID_RESOLVED = await DidState.fetch(network, input.tyronAddr)
        .then(async did_state => {
            const DID_DOC = await DidDoc.read(did_state);
                switch (ACCEPT) {
                    case Accept.contentType:
                        return DID_DOC;
                    case Accept.Result:
                        RESOLUTION_RESULT = {
                            id: DID_DOC.id,
                            resolutionMetadata: BLOCKCHAIN_INFO,
                            document: DID_DOC,
                            metadata: {
                                contentType: "application/did+json",
                                updateKey: did_state.did_update_key,
                                recoveryKey: did_state.did_recovery_key,
                            }
                        };
                        return RESOLUTION_RESULT;
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
            const VERIFICATION_METHODS = state.did_document.public_keys;
            let PUBLIC_KEY;
            let AUTHENTICATION;
            let ASSERTION_METHOD;
            let KEY_AGREEMENT;
            let CAPABILITY_INVOCATION;
            let CAPABILITY_DELEGATION;
            let XSGD_KEY: VerificationMethodModel;

            // Every key MUST have a Public Key Purpose as its ID
            const PURPOSES = Object.keys(VERIFICATION_METHODS);
            const KEYS = Object.entries(VERIFICATION_METHODS);            
            let KEY: string;
            
            if(Array.isArray(PURPOSES)) {
                for(const purpose of PURPOSES) {
                    /** The key ID */
                    const DID_URL: string = ID + '#' + purpose;

                    // The public key
                    KEYS.forEach((value: [string, unknown]) => {
                        if (value[0] === purpose) {
                            KEY = value[1] as string;
                        }
                    });

                    /** The verification method */
                    const VERIFICATION_METHOD: VerificationMethodModel = {
                        id: DID_URL,
                        type: 'SchnorrSecp256k1VerificationKey2019',
                        publicKeyBase58: zcrypto.encodeBase58(KEY!)
                    };
                    console.log(VERIFICATION_METHOD);
                    switch (purpose) {
                        case PublicKeyPurpose.General:
                            PUBLIC_KEY = VERIFICATION_METHOD;                            
                            break;
                        case PublicKeyPurpose.Auth:
                            AUTHENTICATION = VERIFICATION_METHOD;
                            break;
                        case PublicKeyPurpose.Assertion:
                            ASSERTION_METHOD = VERIFICATION_METHOD;
                            break;
                        case PublicKeyPurpose.Agreement:
                            KEY_AGREEMENT = VERIFICATION_METHOD;
                            break;
                        case PublicKeyPurpose.Invocation:
                            CAPABILITY_INVOCATION = VERIFICATION_METHOD;
                            break;
                        case PublicKeyPurpose.Delegation:
                            CAPABILITY_DELEGATION = VERIFICATION_METHOD;
                            break;
                        case PublicKeyPurpose.XSGD:
                            XSGD_KEY = VERIFICATION_METHOD;
                            break;                  
                        default:
                            throw new ErrorCode("InvalidPurpose", `The resolver detected an invalid Public Key Purpose`);
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
            const SCHEME: DidDocScheme = {
                id: ID,
                verificationMethods: {
                    xsgdKey: XSGD_KEY!
                }
            };

            if(PUBLIC_KEY !== undefined) {
                SCHEME.verificationMethods.publicKey = PUBLIC_KEY;
            }
            if(AUTHENTICATION !== undefined) {
                SCHEME.verificationMethods.authentication = AUTHENTICATION;
            }
            if(ASSERTION_METHOD !== undefined) {
                SCHEME.verificationMethods.assertionMethod = ASSERTION_METHOD;
            }
            if(KEY_AGREEMENT !== undefined) {
                SCHEME.verificationMethods.keyAgreement = KEY_AGREEMENT;
            }
            if(CAPABILITY_INVOCATION !== undefined) {
                SCHEME.verificationMethods.capabilityInvocation = CAPABILITY_INVOCATION;
            }
            if(CAPABILITY_DELEGATION!== undefined) {
                SCHEME.verificationMethods.capabilityDelegation = CAPABILITY_DELEGATION;
            }

            if(SERVICES.length !== 0) {
                SCHEME.service = SERVICES;
            }
            return new DidDoc(SCHEME);
        })
        .catch(err => { throw err })
        return DID_DOC;
    }

    /***            ****            ***/

    /** Saves the `Tyron DID-Document` */
    public static async write(did: string, input: DidDoc|ResolutionResult): Promise<void> {
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
    verificationMethods: TyronVerificationMethods;
    service?: DidServiceEndpointModel[];
    created?: number; //MUST be a valid XML datetime value, as defined in section 3.3.7 of [W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes [XMLSCHEMA1.1-2]]. This datetime value MUST be normalized to UTC 00:00, as indicated by the trailing "Z"
    updated?: number; //timestamp of the most recent change
}

export interface ResolutionInput {
    tyronAddr: string;
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
    id: string;
    resolutionMetadata: unknown;
    document: DidDoc;
    metadata: DocumentMetadata;
}

interface DocumentMetadata {
    contentType: string;
    updateKey: string;
    recoveryKey: string;
}
