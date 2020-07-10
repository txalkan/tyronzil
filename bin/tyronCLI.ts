import LogColors from './logColors';
import tyronCreateOperation from '../src/tyronCreateOperation';
import tyronDocument from '../src/tyronDocument';


/** Defines the tyronZIL DID scheme */
interface didScheme {
    schemeIdentifier: string;
    methodName: string;
    methodNamespace: string;
    methodSpecificId: string;
}

/** Handles the tyronZIL CLI operations */
export default class tyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate() {
        const createOperationOutput = await tyronCreateOperation.createOperation();
        const didUniqueSuffix = createOperationOutput.createOperation.didUniqueSuffix;
        const tyronZILScheme: didScheme = {
            schemeIdentifier:'did:',
            methodName: 'tyron:',
            methodNamespace: 'zil:',
            methodSpecificId: didUniqueSuffix,
        }
        console.log(`Your decentralized digital identity on Zilliqa is: ` + LogColors.green(`${tyronZILScheme.schemeIdentifier}${tyronZILScheme.methodName}`) + LogColors.lightBlue(`${tyronZILScheme.methodNamespace}`) + LogColors.brightYellow(`${tyronZILScheme.methodSpecificId}`));
        
        const tyron_did_document: tyronDocument = {
            
        };
    }

}