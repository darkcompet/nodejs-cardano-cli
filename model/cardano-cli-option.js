"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CardanoCliOption {
    constructor(network = "--testnet-magic 1097911063", cliPath) {
        this.network = network;
        this.cliPath = cliPath;
    }
}
exports.default = CardanoCliOption;
