/*
    tyronzil: Tyron Self-Sovereign Identity client for Node.js
    Copyright (C) 2021 Tyron Pungtas Open Association

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/

// Cloned from SidetreeError:
export default class CodeError extends Error {
    constructor(
        public code: string,
        message?: string
    ) {
        super(message ? `${code}: ${message}` : code);
        // NOTE: Extending 'Error' breaks prototype chain since TypeScript 2.1.
        // The following line restores prototype chain.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
