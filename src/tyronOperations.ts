import ServiceEndpointModel from '@decentralized-identity/sidetree/lib/core/versions/latest/models/ServiceEndpointModel';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
//import RecoverOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/RecoverOperation';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import * as crypto from 'crypto';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import PublicKeyPurpose from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/PublicKeyPurpose';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import DocumentModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel';
import CreateOperation from '@decentralized-identity/sidetree/lib/core/versions/latest/CreateOperation';

/** Defines input data for a Sidetree-based `DID-create` tyron-operation REQUEST*/
interface CreateOperationRequestInput {
    recoveryKey: JwkEs256k;
    updateKey: JwkEs256k;
    otherPublicKeys: PublicKeyModel[];
    serviceEndpoints?: ServiceEndpointModel[];
}

/** Defines output data of a Sidetree-based `DID-create` tyron-operation REQUEST*/
interface CreateOperationRequestOutput {
    type: OperationType;
    suffix_data: string;
    delta: string;
}

/** Defines output data of a Sidetree-based `DID-create` tyron-operation */
interface CreateOperationOutput {
    createOperation: CreateOperation;
    operationRequest: CreateOperationRequestOutput;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    signingKey: PublicKeyModel;
    signingPrivateKey: JwkEs256k;
    nextUpdateRevealValueEncodedString: string;
}

/** Defines input data to anchor a Sidetree-based `DID-create` tyron-operation */
interface AnchoredCreateOperationInput {
    transactionNumber: number;
    ledgerTime: number;
    operationIndex: number;
}

/** Model for the anchored `DID-create` tyron-operation */
interface AnchoredOperationModel {
    type: OperationType;
    didUniqueSuffix: string;
    operationBuffer: Buffer;
    transactionNumber: number;
    ledgerTime: number;
    operationIndex: number;
}

/** Defines output data of an anchored `DID-create` tyron-operation */
interface AnchoredCreateOperationOutput {
    createOperation: CreateOperation;
    operationRequest: CreateOperationRequestOutput;
    anchoredOperationModel: AnchoredOperationModel;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    signingKey: PublicKeyModel;
    signingPrivateKey: JwkEs256k;
    nextUpdateRevealValueEncodedString: string;
}

/*
/** Defines input data for a Sidetree-based `DID-recovery` tyron-operation */
/*interface RecoveryOperationInput {
    didUniqueSuffix: string;
    recoveryPrivateKey: JwkEs256k;
}

/** Defines output data for a Sidetree-based `DID-recovery` tyron-operation */
/*interface RecoveryOperationOutput {
    operationBuffer: Buffer;
    recoveryOperation: RecoverOperation;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    signingKey: PublicKeyModel;
    signingPrivateKey: JwkEs256k;
    updateKey: PublicKeyModel;
    updatePrivateKey: JwkEs256k;
}
*/

/** Generates Sidetree-based `DID-tyron-operations` */
export default class tyronOperations {

    /** Generates a random hash */
    public static randomHash(): string {
        const randomBuffer = crypto.randomBytes(32);
        const randomHash = Encoder.encode(Multihash.hash(randomBuffer));
        return randomHash;
    }

    /** 
     * Key algorithm (secp256k1) to generate the asymmetric cryptography for DID operations
     * @returns [publicKey, privateKey] */
    public static async keyAlgorithm(id: string, purpose?: PublicKeyPurpose[]): Promise<[PublicKeyModel, JwkEs256k]> {
        const [publicKey, privateKey] = await Jwk.generateEs256kKeyPair();
        const publicKeyModel = {
            id,
            type: 'EcdsaSecp256k1VerificationKey2019',
            jwk: publicKey,
            purpose: purpose || Object.values(PublicKeyPurpose)
        };
        return [publicKeyModel, privateKey];
    }

    /**
     * Generates an array of service endpoints with the specified ids
     * @param ids array of service-endpoint ids
     */
    public static serviceEndpoints(ids: string[]): ServiceEndpointModel[] {
        const serviceEndpoints = []; 
        for (const id of ids) {
            serviceEndpoints.push(
                {
                    'id': id,
                    'type': 'someType',
                    'endpoint': 'https://www.url.com'
                }
            );
        }
        return serviceEndpoints;
    }

    /** Generates a Sidetree-based `DID-create` tyron-operation REQUEST  */
    public static async createOperationRequest(input: CreateOperationRequestInput): Promise<CreateOperationRequestOutput> {
        const type = OperationType.Create;
        const document: DocumentModel = {
            public_keys: input.otherPublicKeys,
            service_endpoints: input.serviceEndpoints
        };
        const patches = [{
            action: 'replace',
            document
        }];
        const delta = {
            update_commitment: Multihash.canonicalizeThenHashThenEncode(input.updateKey),
            patches
        };
        const deltaBuffer = Buffer.from(JSON.stringify(delta));
        const deltaHash = Encoder.encode(Multihash.hash(deltaBuffer));
        const suffixData = {
            delta_hash: deltaHash,
            recovery_commitment: Multihash.canonicalizeThenHashThenEncode(input.recoveryKey)
            //to-do define commitments
        };
        const suffixDataEncodedString = Encoder.encode(JSON.stringify(suffixData));
        const deltaEncodedString = Encoder.encode(deltaBuffer);
        const createOperationRequestOutput = {
            type: type,
            suffix_data: suffixDataEncodedString,
            delta: deltaEncodedString
        };
        return createOperationRequestOutput;    
    }

    /** Generates a Sidetree-based `DID-create` tyron-operation */
    public static async createOperation(): Promise<CreateOperationOutput> {
        const signingKeyId = 'signingKey';
        const [recoveryKey, recoveryPrivateKey] = await Jwk.generateEs256kKeyPair();
        const [updateKey, updatePrivateKey] = await Jwk.generateEs256kKeyPair();
        const [signingKey, signingPrivateKey] = await tyronOperations.keyAlgorithm(signingKeyId);
        const service = tyronOperations.serviceEndpoints(['serviceEndpointId001', 'serviceEndpointId002']);
        const otherPublicKeys: PublicKeyModel[] = [signingKey];
        const createOperationRequestInput = {
            recoveryKey,
            updateKey,
            otherPublicKeys,
            service
        };
        const operationRequest = await tyronOperations.createOperationRequest(createOperationRequestInput);
        const operationBuffer = Buffer.from(JSON.stringify(operationRequest));
        const createOperation = await CreateOperation.parse(operationBuffer);
        const nextUpdateRevealValueEncodedString = Multihash.canonicalizeThenHashThenEncode(signingKey.jwk);
        const createOperationOutput = {
            createOperation,
            operationRequest,
            recoveryKey,
            recoveryPrivateKey,
            updateKey,
            updatePrivateKey,
            signingKey,
            signingPrivateKey,
            nextUpdateRevealValueEncodedString
        };
        return createOperationOutput;

    }

    /** Generates an anchored `DID-create` tyron-operation */
    public static async anchoredCreateOperation(input: AnchoredCreateOperationInput): Promise<AnchoredCreateOperationOutput> {
        const createOperationOutput = await tyronOperations.createOperation();
        const anchoredOperationModel = {
            type: OperationType.Create,
            didUniqueSuffix: createOperationOutput.createOperation.didUniqueSuffix,
            operationBuffer: createOperationOutput.createOperation.operationBuffer,
            transactionNumber: input.transactionNumber,
            ledgerTime: input.ledgerTime,
            operationIndex: input.operationIndex
        };
        const anchoredCreateOperationOutput = {
            createOperation: createOperationOutput.createOperation,
            operationRequest: createOperationOutput.operationRequest,
            anchoredOperationModel,
            recoveryKey: createOperationOutput.recoveryKey,
            recoveryPrivateKey: createOperationOutput.recoveryPrivateKey,
            updateKey: createOperationOutput.updateKey,
            updatePrivateKey: createOperationOutput.updatePrivateKey,
            signingKey: createOperationOutput.signingKey,
            signingPrivateKey: createOperationOutput.signingPrivateKey,
            nextUpdateRevealValueEncodedString: createOperationOutput.nextUpdateRevealValueEncodedString
        }
        return anchoredCreateOperationOutput;
    }
}