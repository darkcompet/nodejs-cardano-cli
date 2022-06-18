"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __importDefault(require("../nodejs-core/command"));
/**
 * Note: constants are declared outside of class. Maybe leak to caller??
 *
 * File hierarchy
 * + rootDirPath/
 *   - nfts/
 *   - wallets/
 */
const m_policyScriptRpath = "policy/policy.script";
const m_policyIdRpath = "policy/policyId";
class DkCardanoCli {
    constructor(option) {
        this.cliPath = option.cliPath;
        this.network = option.network;
    }
    GeneratePolicyKeys(policyVerificationKeyFilePath, policySigningKeyFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield command_1.default.RunAsync(`
			# Generate new keys (verification and signature) for the NFT policy
			${this.cliPath} address key-gen \
				--verification-key-file ${policyVerificationKeyFilePath} \
				--signing-key-file ${policySigningKeyFilePath};
		`);
        });
    }
    GeneratePolicyScript(policyScriptFilePath, policyVerificationKeyFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield command_1.default.RunAsync(`
			# Generate policy script.
			# Note: at first write, we use > (not >>) to clear current file content if exist
			echo "{" > ${policyScriptFilePath};
			echo "  \\"type\\": \\"all\\"," >> ${policyScriptFilePath};
			echo "  \\"scripts\\":" >> ${policyScriptFilePath};
			echo "  [" >> ${policyScriptFilePath};
			echo "    {" >> ${policyScriptFilePath};
			echo "      \\"type\\": \\"before\\"," >> ${policyScriptFilePath};
			echo "      \\"slot\\": $(expr $(${this.cliPath} query tip ${this.network} | jq .slot?) + 10000)" >> ${policyScriptFilePath};
			echo "    }," >> ${policyScriptFilePath};
			echo "    {" >> ${policyScriptFilePath};
			echo "      \\"type\\": \\"sig\\"," >> ${policyScriptFilePath};
			echo "      \\"keyHash\\": \\"$(${this.cliPath} address key-hash --payment-verification-key-file ${policyVerificationKeyFilePath})\\"" >> ${policyScriptFilePath};
			echo "    }" >> ${policyScriptFilePath};
			echo "  ]" >> ${policyScriptFilePath};
			echo "}" >> ${policyScriptFilePath};
		`);
        });
    }
    /**
     * Parse content from given relative file path of script.
     * @param policyScriptFilePath Relative file path of script.
     * @returns {PolicyScriptResult}
     */
    ParsePolicyScript(policyScriptFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const readResult = yield command_1.default.RunAsync(`cat ${policyScriptFilePath}`);
            const policyScriptContent = JSON.parse(readResult.stdout.trim());
            const result = {
                slot: undefined,
                keyHash: undefined
            };
            if (policyScriptContent) {
                for (const script of policyScriptContent.scripts) {
                    if (script.type === "before") {
                        result.slot = script.slot;
                    }
                    else if (script.type === "sig") {
                        result.keyHash = script.keyHash;
                    }
                }
            }
            return result;
        });
    }
    /**
     * For eg,. when mint new NFT, use this to generate new unique id (policy id) for that NFT.
     * @param policyScriptInFilePath Caller need generate policy script in advanced, then pass relative file path to us.
     * @param policyOutFilePath Which file will be used to store generated policy id.
     * @returns {string} Generated policy id.
     */
    GeneratePolicyId(policyScriptInFilePath, policyOutFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const generatedPolicyIdResult = yield command_1.default.RunAsync(`
			# Generate new policy id, and output it to file
			${this.cliPath} transaction policyid --script-file ${policyScriptInFilePath} > ${policyOutFilePath};

			# Display generated policy id.
			# Note: result here should be trimmed before use since it contains linefeed.
			cat ${policyOutFilePath};
		`);
            // Trim it since content from file may contain linefeed, whitespace...
            return generatedPolicyIdResult.stdout.trim();
        });
    }
    GenerateProtocolParameters(protocolOutFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield command_1.default.RunAsync(`
			# Generate protocol parameters
			${this.cliPath} query protocol-parameters ${this.network} --out-file ${protocolOutFilePath};
		`);
            // # Create new folder and intermediate folders (by -p option)
            // mkdir -p ${this.rootDirPath};
            // # Also log to our metadata
            // echo "wallet_address=${m_targetWalletAddress}" >> ${m_myinfoFileRpath};
        });
    }
    /**
     *
     * @param walletAddress
     * @returns
     */
    QueryUtxo(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = [];
            // Command: cardano-cli query utxo --address addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q --testnet-magic 1097911063
            // UTXO result example:
            //                             TxHash                                 TxIx        Amount
            // --------------------------------------------------------------------------------------
            // 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     0        3414523 lovelace + TxOutDatumNone
            // 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     1        1400000 lovelace + 2 53806701cc6fa0bcbfbfd80962a4fb9978c50db79c516b3ba08e5470.756e646566696e6564 + TxOutDatumNone
            // a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     0        8413071 lovelace + TxOutDatumNone
            // a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     1        1400000 lovelace + 2 9c9388a408baa82362eef736adef5ea5bbc65c65ea5ac7f135571cc7.646b6e66745f7465737432 + TxOutDatumNone
            const utxo_result = yield command_1.default.RunAsync(`
			${this.cliPath} query utxo --address ${walletAddress} ${this.network};
		`);
            const utxo_table = utxo_result.stdout;
            if (!utxo_table) {
                return result;
            }
            const utxo_rows = utxo_table.trim().split('\n');
            let utxo_txHash = undefined;
            let utxo_txIndex = undefined;
            let utxo_txLovelace = undefined;
            // Start read transaction history from row 3
            for (let index = 2, N = utxo_rows.length; index < N; ++index) {
                // Ignore empty char, or use split(/\s+/)
                const utxo_items = utxo_rows[index].trim().split(' ').filter((ch) => ch);
                utxo_txHash = utxo_items[0].trim();
                utxo_txIndex = parseInt(utxo_items[1].trim());
                utxo_txLovelace = parseInt(utxo_items[2].trim());
                result.push({
                    txHash: utxo_txHash,
                    txIndex: utxo_txIndex,
                    lovelace: utxo_txLovelace,
                });
            }
            return result;
        });
    }
}
exports.default = DkCardanoCli;
