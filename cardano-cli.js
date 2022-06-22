"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const fs_1 = require("fs");
const DkConst = __importStar(require("../js-core/constant"));
const Const = __importStar(require("./constant"));
/**
 * Note: constants are declared outside of class. Maybe leak to caller??
 */
class DkCardanoCli {
    constructor(option) {
        var _a;
        this.cliPath = option._cliPath;
        this.network = option._network;
        this.era = (_a = option._era) !== null && _a !== void 0 ? _a : DkConst.EMPTY_STRING;
    }
    /**
     * @param policyVerificationKeyOutFilePath Export to policy.vkey
     * @param policySigningKeyOutFilePath Export to policy.skey
     * @returns Generated file path of keys.
     */
    GeneratePolicyKeysAsync(policyVerificationKeyOutFilePath, policySigningKeyOutFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield command_1.default.RunAsync(`${this.cliPath} address key-gen \
			--verification-key-file ${policyVerificationKeyOutFilePath} \
			--signing-key-file ${policySigningKeyOutFilePath};
		`);
            return {
                vkeyFilePath: policyVerificationKeyOutFilePath,
                skeyFilePath: policySigningKeyOutFilePath,
            };
        });
    }
    /**
     * @param policyScriptOutFilePath
     * @param policyScriptOutContent
     * @returns Generated policy script file path.
     */
    GeneratePolicyScriptAsync(policyScriptOutFilePath, policyScriptOutContent) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs_1.promises.writeFile(policyScriptOutFilePath, policyScriptOutContent);
            return policyScriptOutFilePath;
        });
    }
    /**
     * @param paymentVerificationKeyFilePath
     * @returns Key hash of given address.
     */
    CalculateHashOfAddress(paymentVerificationKeyFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield command_1.default.RunAsync(`${this.cliPath} address key-hash --payment-verification-key-file ${paymentVerificationKeyFilePath}`);
            return response.stdout.trim();
        });
    }
    /**
     * For eg,. when mint new NFT, use this to generate new unique id (policy id) for that NFT.
     * @param policyScriptInFilePath Policy script file path.
     * @param policyIdOutFilePath To be used to store generated policy id.
     * @returns Generated policy id.
     */
    GeneratePolicyIdAsync(policyScriptInFilePath, policyIdOutFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate policy id file
            yield command_1.default.RunAsync(`${this.cliPath} transaction policyid --script-file ${policyScriptInFilePath} > ${policyIdOutFilePath};`);
            // Read entire file content
            const policyBuffer = yield fs_1.promises.readFile(policyIdOutFilePath);
            return policyBuffer.toString().trim();
        });
    }
    /**
     * @param protocolOutFilePath Where to write output.
     * @returns Generated protocol parameters file path.
     */
    GenerateProtocolParametersAsync(protocolOutFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // By default `query` command uses `--cardano-mode`, but we still declare for more clear.
            yield command_1.default.RunAsync(`${this.cliPath} query protocol-parameters ${this.network} --cardano-mode --out-file ${protocolOutFilePath};`);
            return protocolOutFilePath;
        });
    }
    /**
     * @returns Tip in json object.
     */
    QueryTipAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            // By default `query` command uses `--cardano-mode`, but we still declare for more clear.
            const response = yield command_1.default.RunAsync(`${this.cliPath} query tip ${this.network} --cardano-mode`);
            return JSON.parse(response.stdout);
        });
    }
    /**
     * @param walletAddress For eg,. addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q
     * @returns
     */
    QueryUtxoAsync(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = [];
            // Command: cardano-cli query utxo --address addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q --testnet-magic 1097911063
            // UTXO result example:
            //                             TxHash                                 TxIx        Amount
            // --------------------------------------------------------------------------------------
            // 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     0        3414523 lovelace + TxOutDatumNone
            // 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     1        1400000 lovelace + 2 53806701cc6fa0bcbfbfd80962a4fb9978c50db79c516b3ba08e5470.756e646566696e6564 + TxOutDatumNone
            // a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     0        8413071 lovelace + TxOutDatumNone
            // a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     1        1400000 lovelace + 2 9c9388a408baa82362eef736adef5ea5bbc65c65ea5ac7f135571cc7.646b6e66745f7465737432 + TxOutDatumNone
            // By default `query` command uses `--cardano-mode`, but we still declare for more clear.
            const utxo_result = yield command_1.default.RunAsync(`
			${this.cliPath} query utxo --address ${walletAddress} ${this.network} --cardano-mode;
		`);
            const utxo_raw = utxo_result.stdout;
            if (!utxo_raw) {
                return utxos;
            }
            // It is important that we should trim the content from file since it may contain whitespace.
            const utxo_rows = utxo_raw.trim().split(DkConst.LINE_FEED);
            // Start read utxo from row 3
            for (let index = 2, N = utxo_rows.length; index < N; ++index) {
                // Ignore empty char, or use split(/\s+/)
                const utxo_items = utxo_rows[index].trim().split(DkConst.SPACE).filter((ch) => ch);
                const utxo_txHash = utxo_items[0].trim();
                const utxo_txIndex = parseInt(utxo_items[1].trim());
                // For remain part, we need split plus (+) to parse each component
                let utxo_datumHash = null;
                const assets = [];
                const segments = utxo_items.slice(2, utxo_items.length).join(DkConst.SPACE).split('+');
                for (const segment of segments) {
                    // Parse datum
                    if (segment.includes("TxOutDatumHash") || segment.includes("TxOutDatumNone")) {
                        if (!segment.includes("None")) {
                            utxo_datumHash = JSON.parse(segment.trim().split(DkConst.SPACE)[2]);
                        }
                        continue;
                    }
                    // Parse asset
                    const quantity2asset = segment.trim().split(DkConst.SPACE);
                    assets.push({
                        _name: quantity2asset[1],
                        _quantity: parseInt(quantity2asset[0])
                    });
                }
                utxos.push({
                    _txHash: utxo_txHash,
                    _txIndex: utxo_txIndex,
                    _datumHash: utxo_datumHash,
                    _assets: assets
                });
            }
            return utxos;
        });
    }
    /**
     * See command usage: cardano-cli transaction build-raw -h
     * @param option
     * @returns Tx raw body file path.
     */
    BuildRawTransactionAsync(option) {
        return __awaiter(this, void 0, void 0, function* () {
            const txInOption = yield this.BuildTxInOptionAsync(option._txInOptions);
            const txOutOption = this.BuildTxOutOption(option._txOutOptions);
            const txInCollateralOption = option._txInCollateralOptions ? yield this.BuildTxInOptionAsync(option._txInCollateralOptions, true) : DkConst.EMPTY_STRING;
            const mintOption = option._mintOptions ? yield this.BuildMintOptionAsync(option._mintOptions) : DkConst.EMPTY_STRING;
            const withdrawalOption = option._withdrawalOptions ? yield this.BuildWithdrawalOptionAsync(option._withdrawalOptions) : DkConst.EMPTY_STRING;
            const certsOption = option._certsOption ? yield this.BuildCertOptionAsync(option._certsOption) : DkConst.EMPTY_STRING;
            const metadataOption = option._metadataOption ? yield this.BuildMetadataOptionAsync(option._metadataOption) : DkConst.EMPTY_STRING;
            const auxScriptOpion = option._auxScriptOptions ? yield this.BuildAuxScriptOptionAsync(option._auxScriptOptions) : DkConst.EMPTY_STRING;
            // Caller should do it before call us??
            yield this.GenerateProtocolParametersAsync(option._protocolParametersFilePath);
            const scriptInvalidOption = option._scriptInvalid ? "--script-invalid" : DkConst.EMPTY_STRING;
            // We need 10000/60 = 160 minutes
            const invalidHereAfterValue = option._invalidAfter ? option._invalidAfter : (yield this.QueryTipAsync()).slot + 10000;
            const invalidBeforeValue = option._invalidBefore ? option._invalidBefore : 0;
            const feeValue = option._fee ? option._fee : 0;
            yield command_1.default.RunAsync(`
			${this.cliPath} transaction build-raw \
				--alonzo-era \
				${txInOption} \
				${txOutOption} \
				${txInCollateralOption} \
				${certsOption} \
				${withdrawalOption} \
				${mintOption} \
				${auxScriptOpion} \
				${metadataOption} \
				${scriptInvalidOption} \
				--invalid-hereafter ${invalidHereAfterValue} \
				--invalid-before ${invalidBeforeValue} \
				--fee ${feeValue} \
				--out-file ${option._txRawBodyOutFilePath} \
				--protocol-params-file ${option._protocolParametersFilePath} \
				${this.era}
		`);
            return option._txRawBodyOutFilePath;
        });
    }
    /**
     *
     * @param option
     * @returns Minimum fee in lovelace unit.
     */
    CalculateTransactionMinFeeAsync(option) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield command_1.default.RunAsync(`
			${this.cliPath} transaction calculate-min-fee \
				--tx-body-file ${option._txRawBodyFilePath} \
				--tx-in-count ${option._txInCount} \
				--tx-out-count ${option._txOutCount} \
				${this.network} \
				--witness-count ${option._witnessCount} \
				--protocol-params-file ${option._protocolParametersFilePath}
		`);
            return parseInt(response.stdout.trim().split(DkConst.SPACE)[0]);
            // return parseInt(
            // 	execSync()
            // 		.toString()
            // 		.replace(/\s+/g, " ")
            // 		.split(" ")[0]
            // );
        });
    }
    /**
     * Sign a transaction from tx raw body file.
     * This will generate tx signed body file.
     * In general, caller should build raw transaction before call this.
     * @param option
     * @returns Tx signed body out-file path.
     */
    SignTransactionAsync(option) {
        return __awaiter(this, void 0, void 0, function* () {
            const signingKeyOption = option._skeyFilePaths.map(filePath => `--signing-key-file ${filePath}`).join(DkConst.SPACE);
            yield command_1.default.RunAsync(`
			${this.cliPath} transaction sign \
				--tx-body-file ${option._txRawBodyFilePath} \
				${this.network} \
				${signingKeyOption} \
				--out-file ${option._txSignedBodyOutFilePath}
		`);
            return option._txSignedBodyOutFilePath;
        });
    }
    /**
     * In general, caller should sign a transaction before call this.
     * @returns Transaction hash.
     */
    SubmitTransactionAsync(option) {
        return __awaiter(this, void 0, void 0, function* () {
            yield command_1.default.RunAsync(`${this.cliPath} transaction submit ${this.network} --tx-file ${option._txSignedBodyFilePath}`);
            return this.QueryTransactionIdAsync({ _txFilePath: option._txSignedBodyFilePath });
        });
    }
    QueryTransactionIdAsync(option) {
        return __awaiter(this, void 0, void 0, function* () {
            let txOption = DkConst.EMPTY_STRING;
            if (option._txFilePath) {
                txOption += `--tx-file ${option._txFilePath}`;
            }
            if (option._txBodyFilePath) {
                txOption += `--tx-body-file ${option._txBodyFilePath}`;
            }
            if (!txOption) {
                throw new Error("Must provide one of: txFilePath or txBodyFilePath");
            }
            const response = yield command_1.default.RunAsync(`${this.cliPath} transaction txid ${txOption}`);
            return response.stdout.trim();
        });
    }
    BuildTxInOptionAsync(txInOptions, isCollateral = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = DkConst.EMPTY_STRING;
            for (const option of txInOptions) {
                result += ` --tx-in${isCollateral ? "-collateral" : ""} ${option._txHash}#${option._txIndex}`;
                if (option._script) {
                    if (!option._script._outFilePath || !option._script._outContent) {
                        throw new Error("Script file path and content are needed");
                    }
                    yield fs_1.promises.writeFile(option._script._outFilePath, option._script._outContent);
                    const scriptFilePath = option._script._outFilePath;
                    result += ` --tx-in-script-file ${scriptFilePath}`;
                }
                if (option._datum) {
                    result += ` --tx-in-datum-value '${option._datum}'`;
                }
                if (option._redeemer) {
                    result += ` --tx-in-redeemer-value '${option._redeemer}'`;
                }
                if (option._executionUnits) {
                    result += ` --tx-in-execution-units "(${option._executionUnits[0] + "," + option._executionUnits[1]})"`;
                }
            }
            return result.trimStart();
        });
    }
    /**
     * @param txOutOptions
     * @returns For eg,. --tx-out addr_test1Alsdkadsk+4800000+"10 mynft1+32 mynft2"
     */
    BuildTxOutOption(txOutOptions) {
        let result = DkConst.EMPTY_STRING;
        for (let index = 0, N = txOutOptions.length; index < N; ++index) {
            const txOutOption = txOutOptions[index];
            // For ADA asset (lovelace)
            result += ` --tx-out ${txOutOption._address}+${txOutOption._asset2quantity[Const.LOVELACE]}`;
            // For non-ADA asset (NFT,...)
            let nonAdaAssetOption = DkConst.EMPTY_STRING;
            for (const asset in txOutOption._asset2quantity) {
                if (asset != Const.LOVELACE) {
                    nonAdaAssetOption += `+${txOutOption._asset2quantity[asset]} ${asset}`;
                }
            }
            if (nonAdaAssetOption) {
                result += `+"${nonAdaAssetOption.slice(1)}"`;
            }
            // For datum
            if (txOutOption._datumHash) {
                result += ` --tx-out-datum-hash ${txOutOption._datumHash}`;
            }
        }
        return result.trimStart();
    }
    BuildMintOptionAsync(mintOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            // [Build --mint]
            let result = `--mint="`;
            for (let index = 0, lastIndex = mintOptions.length - 1; index <= lastIndex; ++index) {
                const option = mintOptions[index];
                const ok = (option._action == "mint" || option._action == "burn") && (option._assetNameInHex && option._assetQuantity);
                if (!ok) {
                    throw new Error("Must provide valid: action, asset, quantity");
                }
                // In theory, for Mint we add (+), for Burn we subtract (-).
                // By default, don't need add + for minting.
                const plus = index < lastIndex ? "+" : "";
                result += `${option._action == "mint" ? "" : "-"}${option._assetQuantity} ${option._assetNameInHex}${plus}`;
            }
            result = result.trimEnd() + `"`;
            // [Build --mint-script-file]
            for (let index = 0, N = mintOptions.length; index < N; ++index) {
                const option = mintOptions[index];
                result += ` --mint-script-file ${option._policyScriptFilePath}`;
                if (option._redeemer) {
                    result += ` --mint-redeemer-value '${option._redeemer}'`;
                }
                if (option._executionUnits) {
                    result += ` --mint-execution-units "(${option._executionUnits[0]},${option._executionUnits[1]})"`;
                }
            }
            return result;
        });
    }
    BuildWithdrawalOptionAsync(withdrawalOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = DkConst.EMPTY_STRING;
            for (const option of withdrawalOptions) {
                result += ` --withdrawal ${option._stakingAddress}+${option._reward}`;
                if (option._scriptOutContent) {
                    yield fs_1.promises.writeFile(option._scriptOutFilePath, option._scriptOutContent);
                    const scriptInFilePath = option._scriptOutFilePath;
                    result += ` --withdrawal-script-file ${scriptInFilePath}`;
                }
                if (option._datum) {
                    result += ` --withdrawal-script-datum-value '${option._datum}'`;
                }
                if (option._redeemer) {
                    result += ` --withdrawal-script-redeemer-value '${option._redeemer}'`;
                }
                if (option._executionUnits) {
                    result += ` --withdrawal-execution-units "(${option._executionUnits[0]},${option._executionUnits[1]})"`;
                }
            }
            return result.trim();
        });
    }
    BuildCertOptionAsync(certOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = DkConst.EMPTY_STRING;
            for (const option of certOptions) {
                result += ` --certificate ${option._cert}`;
                if (option._script) {
                    yield fs_1.promises.writeFile(option._script._outFilePath, option._script._outContent);
                    result += ` --certificate-script-file ${option._script._outFilePath}`;
                }
                if (option._datum) {
                    result += ` --certificate-script-datum-value '${option._datum}'`;
                }
                if (option._redeemer) {
                    result += ` --certificate-script-redeemer-value '${option._redeemer}'`;
                }
                if (option._executionUnits) {
                    result += ` --certificate-execution-units "(${option._executionUnits[0] + "," + option._executionUnits[1]})"`;
                }
            }
            return result.trim();
        });
    }
    BuildMetadataOptionAsync(option) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs_1.promises.writeFile(option._metadataOutFilePath, option._metadataOutContent);
            const metadataInFilePath = option._metadataOutFilePath;
            return `--metadata-json-file ${metadataInFilePath}`;
        });
    }
    BuildAuxScriptOptionAsync(auxScriptOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = DkConst.EMPTY_STRING;
            for (const option of auxScriptOptions) {
                yield fs_1.promises.writeFile(option._script._outFilePath, option._script._outContent);
                result += ` --auxiliary-script-file ${option._script._outFilePath}`;
            }
            return result.trimStart();
        });
    }
}
exports.default = DkCardanoCli;
