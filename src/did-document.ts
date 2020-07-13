//import DidState from '@decentralized-identity/sidetree/dist/lib/core/models/DidState';
import DidCreate from './did-operations/did-create';
//import DocumentModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel';
import VerificationMethodModel from './models/verification-method-model';
//import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import PublicKeyPurpose from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/PublicKeyPurpose';

interface DidDocOutput {
    id: string;
    verificationMethod?: VerificationMethodModel[];
    publicKey?: VerificationMethodModel[];
    authentication?: (string | VerificationMethodModel)[];
    controller?: string;
    service?: ServiceEndpointModel[];
    created?: number; //MUST be a valid XML datetime value, as defined in section 3.3.7 of [W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes [XMLSCHEMA1.1-2]]. This datetime value MUST be normalized to UTC 00:00, as indicated by the trailing "Z"
    updated?: number; // timestamp of the most recent change
}

export default class DidDoc {
    public readonly id: string;
    public readonly controller?: string;
    public readonly verificationMethod?: VerificationMethodModel[];
    public readonly publicKey?: VerificationMethodModel[];
    public readonly authentication?: (string | VerificationMethodModel)[];
    public readonly service?: ServiceEndpointModel[];

    private constructor (
        operationOutput: DidDocOutput
    ) {
        this.id = operationOutput.id;
        this.controller = operationOutput.controller;
        this.publicKey = operationOutput.publicKey;
        this.authentication = operationOutput.authentication;
        this.service = operationOutput.service;
    }

    /** Creates a brand new DID and its document */
    public static async new(): Promise<DidDoc> {
        const DID_CREATED: DidCreate = await DidCreate.execute();
        const DID_SUFFIX = DID_CREATED.didSuffix;
        const NET = 'testnet:'; // to-do add namespace 
        const ID: string = 'did:tyron:zil:' + NET + DID_SUFFIX;
        
        const SIGNING_KEYS: PublicKeyModel[] = DID_CREATED.signingKeys;
        const PUBLIC_KEY = [];
        const AUTHENTICATION = [];

        if (Array.isArray(SIGNING_KEYS)) {
            for (const key of SIGNING_KEYS) {
                const id: string = ID + '#' + key.id;
                const VERIFICATION_METHOD: VerificationMethodModel = {
                    id: id,
                    type: key.type,
                    // at this point in the development, every tyronZIL DID is the sole controller of its own DID
                    controller: ID,
                    jwk: key.jwk
                };
                const PURPOSE: Set<string> = new Set(key.purpose);
                if (PURPOSE.has(PublicKeyPurpose.General)) {
                    PUBLIC_KEY.push(VERIFICATION_METHOD);
                    if (PURPOSE.has(PublicKeyPurpose.Auth)) {
                        // referenced key:
                        AUTHENTICATION.push(id);
                    }
                } else if (PURPOSE.has(PublicKeyPurpose.Auth)) {
                    // embedded key:
                    AUTHENTICATION.push(VERIFICATION_METHOD);
                }
            }
        }

        const SERVICE_ENDPOINTS = DID_CREATED.serviceEndpoints;
        const SERVICE = [];
        
        if (Array.isArray(SERVICE_ENDPOINTS)) {
            for (const service of SERVICE_ENDPOINTS) {
                const serviceEndpoint: ServiceEndpointModel = {
                    id: ID + '#' + service.id,
                    type: service.type,
                    endpoint: service.endpoint
                };
                SERVICE.push(serviceEndpoint);
            }
        }

        const OPERATION_OUTPUT: DidDocOutput = {
            id: ID,
        };
        
        if (PUBLIC_KEY.length !== 0) {
            OPERATION_OUTPUT.publicKey = PUBLIC_KEY;
        }

        if (AUTHENTICATION.length !== 0) {
            OPERATION_OUTPUT.authentication = AUTHENTICATION;
        }

        if (SERVICE.length !== 0) {
            OPERATION_OUTPUT.service = SERVICE;
        }

        return new DidDoc(OPERATION_OUTPUT);
    }
}
