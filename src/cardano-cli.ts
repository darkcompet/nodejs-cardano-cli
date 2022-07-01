import { promises as fsAsync } from 'fs';
import { DkConst } from "@darkcompet/js-core";
import { DkCommand } from "@darkcompet/nodejs-core";

import * as Model from "./model";
import * as Const from "./constant";

/**
 * Note: constants are declared outside of class. Maybe leak to caller??
 */
export class DkCardanoCli {
	cliPath: string; // cardano-cli command path
	network: string; // mainnet or testnet

	constructor(option: Model.ConstructOption) {
		this.cliPath = option._cliPath;
		this.network = option._network;
	}

	/**
	 * Usecase: when create new wallet, or policy of an asset (NFT,...),
	 * normally we generate new address key pair for verifying, signing transaction later.
	 *
	 * @param vkeyOutFilePath Where to export verification key (.vkey)
	 * @param skeyOutFilePath Where to export signing key (.skey)
	 *
	 * @returns File path of generated key pair.
	 */
	async GenerateAddressKeysAsync(vkeyOutFilePath: string, skeyOutFilePath: string): Promise<Model.KeyPair> {
		await DkCommand.RunAsync(`${this.cliPath} address key-gen --verification-key-file ${vkeyOutFilePath} --signing-key-file ${skeyOutFilePath};`);

		return {
			_vkeyFilePath: vkeyOutFilePath,
			_skeyFilePath: skeyOutFilePath,
		};
	}

	/**
	 * Build Shelley payment address from given verification key.
	 *
	 * @param paymentVkeyFilePath
	 * @param paymentAddressOutFilePath
	 *
	 * @returns Generated payment address and its file path.
	 */
	async BuildPaymentAddressAsync(paymentVkeyFilePath: string, paymentAddressOutFilePath: string): Promise<Model.PaymentAddress> {
		// Generate payment address
		await DkCommand.RunAsync(`
			${this.cliPath} address build ${this.network} \
				--payment-verification-key-file ${paymentVkeyFilePath} \
				--out-file ${paymentAddressOutFilePath};
		`);

		const paymentAddressBuffer = await fsAsync.readFile(paymentAddressOutFilePath);

		return {
			_paymentAddress: paymentAddressBuffer.toString().trim(),
			_paymentAddressFilePath: paymentAddressOutFilePath
		};
	}

	/**
	 * @param outFilePath
	 * @param outContent
	 * @returns Generated file path.
	 */
	async WriteFileAsync(outFilePath: string, outContent: string): Promise<string> {
		await fsAsync.writeFile(outFilePath, outContent);
		return outFilePath;
	}

	/**
	 * Calculate key hash from given payment vkey file.
	 * @param paymentVerificationKeyFilePath
	 * @returns Key hash of given address.
	 */
	async CalculateKeyHashOfPaymentAddress(paymentVerificationKeyFilePath: string): Promise<string> {
		const response = await DkCommand.RunAsync(`${this.cliPath} address key-hash --payment-verification-key-file ${paymentVerificationKeyFilePath}`);

		return response.stdout.trim();
	}

	/**
	 * For eg,. when mint new NFT, use this to generate new unique id (policy id) for that NFT.
	 * @param policyScriptInFilePath Policy script file path.
	 * @param policyIdOutFilePath To be used to store generated policy id.
	 * @returns Generated policy id.
	 */
	async GeneratePolicyIdAsync(policyScriptInFilePath: string, policyIdOutFilePath: string): Promise<string> {
		// Generate policy id file
		await DkCommand.RunAsync(`${this.cliPath} transaction policyid --script-file ${policyScriptInFilePath} > ${policyIdOutFilePath};`);

		// Read entire file content
		const policyBuffer = await fsAsync.readFile(policyIdOutFilePath);

		return policyBuffer.toString().trim();
	}

	/**
	 * @param protocolOutFilePath Where to write output.
	 * @returns Generated protocol parameters file path.
	 */
	async GenerateProtocolParametersAsync(protocolOutFilePath: string): Promise<string> {
		// By default `query` command uses `--cardano-mode`, but we still declare for more clear.
		await DkCommand.RunAsync(`${this.cliPath} query protocol-parameters ${this.network} --cardano-mode --out-file ${protocolOutFilePath};`);

		return protocolOutFilePath;
	}

	/**
	 * @returns Tip in json object.
	 */
	async QueryTipAsync(): Promise<Model.QueryTipJsonResponse> {
		// By default `query` command uses `--cardano-mode`, but we still declare for more clear.
		const response = await DkCommand.RunAsync(`${this.cliPath} query tip ${this.network} --cardano-mode`);
		return JSON.parse(response.stdout);
	}

	/**
	 * @param walletAddress For eg,. addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q
	 * @returns
	 */
	async QueryUtxoAsync(walletAddress: string): Promise<Model.Utxo[]> {
		const utxos: Model.Utxo[] = [];

		// Command: cardano-cli query utxo --address addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q --testnet-magic 1097911063
		// UTXO result example:
		//                             TxHash                                 TxIx        Amount
		// --------------------------------------------------------------------------------------
		// 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     0        3414523 lovelace + TxOutDatumNone
		// 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     1        1400000 lovelace + 2 53806701cc6fa0bcbfbfd80962a4fb9978c50db79c516b3ba08e5470.756e646566696e6564 + TxOutDatumNone
		// a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     0        8413071 lovelace + TxOutDatumNone
		// a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     1        1400000 lovelace + 2 9c9388a408baa82362eef736adef5ea5bbc65c65ea5ac7f135571cc7.646b6e66745f7465737432 + TxOutDatumNone

		// By default `query` command uses `--cardano-mode`, but we still declare for more clear.
		const utxo_result = await DkCommand.RunAsync(`
			${this.cliPath} query utxo ${this.network} --address ${walletAddress} --cardano-mode;
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
			const utxo_items = utxo_rows[index].trim().split(DkConst.SPACE).filter((ch: any) => ch);
			const utxo_txHash = utxo_items[0].trim();
			const utxo_txIndex = parseInt(utxo_items[1].trim());

			// For remain part, we need split plus (+) to parse each component
			let utxo_datumHash = null;
			const asset2quantity: any = {};
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
				let [quantity, name] = segment.trim().split(DkConst.SPACE);
				quantity = parseInt(quantity);

				// It is should not happen, but for safe, we should sum up.
				if (!asset2quantity[name]) {
					asset2quantity[name] = 0;
				}
				asset2quantity[name] += quantity;
			}

			utxos.push({
				_txHash: utxo_txHash,
				_txIndex: utxo_txIndex,
				_datumHash: utxo_datumHash,
				_asset2quantity: asset2quantity
			});
		}

		return utxos;
	}

	/**
	 * This uses `QueryUtxoAsync()` to customize some extra info.
	 * Note: balance is sum up of asset2quantity at same key, for eg,.
	 * - balance: { "lovelace": 120, "mynft1": 3 }
	 * - asset2quantity_1: { "lovelace": 90 , "mynft1": 2 }
	 * - asset2quantity_2: { "lovelace": 30, "mynft1": 1 }
	 *
	 * @param walletAddress
	 * @returns Balance and Utxos.
	 */
	async QueryWalletInfoAsync(walletAddress: string): Promise<Model.WalletInfo> {
		const utxos = await this.QueryUtxoAsync(walletAddress);

		// Calculate balance (total quantity on each asset).
		const balance: any = {};

		for (const utxo of utxos) {
			for (const asset in utxo._asset2quantity) {
				if (!balance[asset]) {
					balance[asset] = 0;
				}
				balance[asset] += utxo._asset2quantity[asset];
			}
		}

		return {
			_balance: balance,
			_utxos: utxos,
		};
	}

	/**
	 * See command usage: cardano-cli transaction build-raw -h
	 * @param option
	 * @returns Tx raw body file path.
	 */
	async BuildRawTransactionAsync(option: Model.BuildRawTransactionOption): Promise<string> {
		const eraOption = option._era ? option._era : DkConst.EMPTY_STRING; // "--alonzo-era";
		const txInOption = await this.BuildTxInOptionAsync(option._txIns);
		const txOutOption = this.BuildTxOutOption(option._txOuts);
		const txInCollateralOption = option._txInCollateralOptions ? await this.BuildTxInOptionAsync(option._txInCollateralOptions, true) : DkConst.EMPTY_STRING;
		const mintOption = option._mintOptions ? await this.BuildMintOptionAsync(option._mintOptions) : DkConst.EMPTY_STRING;
		const withdrawalOption = option._withdrawalOptions ? await this.BuildWithdrawalOptionAsync(option._withdrawalOptions) : DkConst.EMPTY_STRING;
		const certsOption = option._certsOption ? await this.BuildCertOptionAsync(option._certsOption) : DkConst.EMPTY_STRING;
		const metadataOption = option._metadataOption ? await this.BuildMetadataOptionAsync(option._metadataOption) : DkConst.EMPTY_STRING;
		const auxScriptOpion = option._auxScriptOptions ? await this.BuildAuxScriptOptionAsync(option._auxScriptOptions) : DkConst.EMPTY_STRING;
		const scriptInvalidOption = option._scriptInvalid ? "--script-invalid" : DkConst.EMPTY_STRING;
		const invalidBeforeOption = option._invalidBefore ? `--invalid-before ${option._invalidBefore}` : DkConst.EMPTY_STRING;
		const invalidHereAfterOption = option._invalidAfter ? `--invalid-hereafter ${option._invalidAfter}` : DkConst.EMPTY_STRING;

		await DkCommand.RunAsync(`
			${this.cliPath} transaction build-raw \
				${txInOption} \
				${txOutOption} \
				${txInCollateralOption} \
				${certsOption} \
				${withdrawalOption} \
				${mintOption} \
				${auxScriptOpion} \
				${metadataOption} \
				${scriptInvalidOption} \
				${invalidBeforeOption} \
				${invalidHereAfterOption} \
				--fee ${option._fee} \
				--out-file ${option._txRawBodyOutFilePath} \
				--protocol-params-file ${option._protocolParametersFilePath} \
				${eraOption}
		`);

		return option._txRawBodyOutFilePath;
	}

	/**
	 * @param option
	 * @returns Minimum fee in lovelace unit.
	 */
	async CalculateTransactionMinFeeAsync(option: Model.CalculateTransactionMinFeeOption): Promise<number> {
		const response = await DkCommand.RunAsync(`
			${this.cliPath} transaction calculate-min-fee ${this.network} \
				--tx-body-file ${option._txRawBodyFilePath} \
				--tx-in-count ${option._txInCount} \
				--tx-out-count ${option._txOutCount} \
				--witness-count ${option._witnessCount} \
				--protocol-params-file ${option._protocolParametersFilePath}
		`);

		return parseInt(response.stdout.trim().split(DkConst.SPACE)[0]);
	}

	/**
	 * Sign a transaction from tx raw body file.
	 * This will generate tx signed body file.
	 * In general, caller should build raw transaction before call this.
	 * @param option
	 * @returns Tx signed body out-file path.
	 */
	async SignTransactionAsync(option: Model.SignTransactionOption): Promise<string> {
		const signingKeyOption = option._skeyFilePaths.map(filePath => `--signing-key-file ${filePath}`).join(DkConst.SPACE);

		await DkCommand.RunAsync(`
			${this.cliPath} transaction sign ${this.network} \
				--tx-body-file ${option._txRawBodyFilePath} \
				${signingKeyOption} \
				--out-file ${option._txSignedBodyOutFilePath}
		`);

		return option._txSignedBodyOutFilePath;
	}

	/**
	 * In general, caller should sign a transaction before call this.
	 * @returns Transaction hash.
	 */
	async SubmitTransactionAsync(option: Model.SubmitTransactionOption): Promise<string> {
		await DkCommand.RunAsync(`${this.cliPath} transaction submit ${this.network} --tx-file ${option._txSignedBodyFilePath}`);

		return this.QueryTransactionIdAsync({ _txFilePath: option._txSignedBodyFilePath });
	}

	private async QueryTransactionIdAsync(option: Model.QueryTransactionIdOption): Promise<string> {
		let txOption = DkConst.EMPTY_STRING;
		if (option._txFilePath) {
			txOption += `--tx-file ${option._txFilePath}`
		}
		if (option._txBodyFilePath) {
			txOption += `--tx-body-file ${option._txBodyFilePath}`;
		}

		if (!txOption) {
			throw new Error("Must provide one of: txFilePath or txBodyFilePath");
		}

		const response = await DkCommand.RunAsync(`${this.cliPath} transaction txid ${txOption}`);

		return response.stdout.trim();
	}

	private async BuildTxInOptionAsync(txIns: Model.TxIn[], isCollateral: boolean = false): Promise<string> {
		let result = DkConst.EMPTY_STRING;

		for (const option of txIns) {
			result += ` --tx-in${isCollateral ? "-collateral" : ""} ${option._txHash}#${option._txIndex}`;

			if (option._script) {
				if (!option._script._outFilePath || !option._script._outContent) {
					throw new Error("Script file path and content are needed");
				}
				await fsAsync.writeFile(option._script._outFilePath, option._script._outContent);
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
	}

	/**
	 * @param txOuts
	 * @returns For eg,. --tx-out addr_test1Alsdkadsk+4800000+"10 mynft1+32 mynft2"
	 */
	private BuildTxOutOption(txOuts: Model.TxOut[]): string {
		let result = DkConst.EMPTY_STRING;

		for (let index = 0, N = txOuts.length; index < N; ++index) {
			const txOutOption = txOuts[index];

			// For ADA asset (lovelace)
			if (!txOutOption._asset2quantity[Const.LOVELACE]) {
				throw new Error("Must send some lovelaces");
			}
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

	private async BuildMintOptionAsync(options: Array<Model.MintInfo>): Promise<string> {
		// [Build --mint]
		// For burn, just add - before asset quantity.
		// For eg,. --mint="1 policyidA.mynftA+5 policyidB.mynftB+-2 policyidC.mynftC"
		let result = `--mint="`;

		for (let index = 0, lastIndex = options.length - 1; index <= lastIndex; ++index) {
			const option = options[index];
			const ok = (option._action == "mint" || option._action == "burn") && option._assetNameInHex && option._assetQuantity;
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
		for (let index = 0, N = options.length; index < N; ++index) {
			const option = options[index];

			result += ` --mint-script-file ${option._policyScriptFilePath}`;

			if (option._redeemer) {
				result += ` --mint-redeemer-value '${option._redeemer}'`;
			}
			if (option._executionUnits) {
				result += ` --mint-execution-units "(${option._executionUnits[0]},${option._executionUnits[1]})"`;
			}
		}

		return result;
	}

	private async BuildWithdrawalOptionAsync(options: Model.WithdrawalOption[]): Promise<string> {
		let result = DkConst.EMPTY_STRING;

		for (const option of options) {
			result += ` --withdrawal ${option._stakingAddress}+${option._reward}`;

			if (option._scriptOutContent) {
				await fsAsync.writeFile(option._scriptOutFilePath, option._scriptOutContent);
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
	}

	private async BuildCertOptionAsync(options: Model.CertOption[]): Promise<string> {
		let result = DkConst.EMPTY_STRING;

		for (const option of options) {
			result += ` --certificate ${option._cert}`;

			if (option._script) {
				await fsAsync.writeFile(option._script._outFilePath, option._script._outContent);
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
	}

	private async BuildMetadataOptionAsync(option: Model.MetadataOption): Promise<string> {
		await fsAsync.writeFile(option._metadataOutFilePath, option._metadataOutContent);

		const metadataInFilePath = option._metadataOutFilePath;

		return `--metadata-json-file ${metadataInFilePath}`;
	}

	private async BuildAuxScriptOptionAsync(options: Model.AuxScriptOption[]) {
		let result = DkConst.EMPTY_STRING;

		for (const option of options) {
			await fsAsync.writeFile(option._script._outFilePath, option._script._outContent);
			result += ` --auxiliary-script-file ${option._script._outFilePath}`;
		}

		return result.trimStart();
	}
}
