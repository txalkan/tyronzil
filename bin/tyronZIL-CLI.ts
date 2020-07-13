import LogColors from './log-colors';
import didCreate from '../src/did-operations/did-create';
import DidDoc from '../src/did-document';

//import tyronDocument from '../src/did-document';


/** Defines the tyronZIL DID scheme */
interface didScheme {
    schemeIdentifier: string;
    methodName: string;
    methodNamespace: string;
    methodSpecificId: string;
}

/** Handles the tyronZIL CLI DID operations */
export default class tyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate(): Promise<void> {
        const DID_CREATED = await didCreate.execute();
        const DID_SUFFIX = DID_CREATED.didSuffix;
        const TYRONZIL_SCHEME: didScheme = {
            schemeIdentifier:'did:',
            methodName: 'tyron:',
            methodNamespace: 'zil:',
            methodSpecificId: DID_SUFFIX,
        }
        console.log(`Your decentralized digital identity on Zilliqa is: ` + LogColors.green(`${TYRONZIL_SCHEME.schemeIdentifier}${TYRONZIL_SCHEME.methodName}`) + LogColors.lightBlue(`${TYRONZIL_SCHEME.methodNamespace}`) + LogColors.brightYellow(`${TYRONZIL_SCHEME.methodSpecificId}`));
        
        const PUBLIC_KEY = JSON.stringify(DID_CREATED.signingKeys);
        console.log(`& your public key is: ${PUBLIC_KEY}`);
        
        const SERVICE = JSON.stringify(DID_CREATED.serviceEndpoints);
        console.log(`& your service endpoints are: ${SERVICE}`);
        
        const TYRONZIL_DOCUMENT = await DidDoc.new();
        const DOC_STRING = JSON.stringify(TYRONZIL_DOCUMENT);
        console.log(`& youR DID-document is: ${DOC_STRING}`);
    }

}