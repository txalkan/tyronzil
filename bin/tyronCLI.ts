import tyronOperations from '../src/tyronOperations';

/** Handles the tyronZIL CLI operations */
export default class tyronCLI {

    /** Handles the `create` subcommand */
    public static async handleCreate() {
        const createOperationData = await tyronOperations.createOperation();

    }

}