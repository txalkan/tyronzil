import tyronOperations from '../src/tyronOperations';

/** Handles the tyronZIL CLI operations */
export default class tyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate() {
        const createOperationOutput = await tyronOperations.createOperation();
        const didSuffix= createOperationOutput.createOperation.didUniqueSuffix;

        console.log(`Your decentralized digital identity on Zilliqa is: ` + `did:tyron:zil:${didSuffix}`);
    }

}