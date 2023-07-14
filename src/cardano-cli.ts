import { DkConst } from "@darkcompet/js-core";
import { DkCommander as Cmd, DkFiles, RunCommandResult } from "@darkcompet/nodejs-core";

import * as Model from "./model";
import { Helper } from "./helper";

/**
 * Note: constants are declared outside of class. Maybe leak to caller??
 */
export class DkCardanoCli {
	/**
	 * Path of cardano-cli command.
	 */
	private readonly cliPath: string;

	/**
	 * --mainnet or --testnet-magic 1097911063
	 */
	private readonly network: string;

	/**
	 * To unset era, just provide empty string (not null).
	 * @param era For eg,. `--alonzo-era`, `--babbage-era`, ...
	 */
	private readonly era: string;

	constructor(option: Model.ConstructOption) {
		this.cliPath = option._cliPath;
		this.network = option._network;
		this.era = option._era ?? "";
	}

	/**
	 * Generate verification key and signing key of Cardano blockchain.
	 * It is required when we create new wallet, token, NFT,...
	 *
	 * @param vkeyOutFilePath OutFilePath for export verification key (.vkey)
	 * @param skeyOutFilePath OutFilePath for export signing key (.skey)
	 *
	 * @throws Error if something go wrong.
	 * @returns File paths of generated key pair.
	 */
	async GenerateAddressKeyPairAsyncOrThrow(vkeyOutFilePath: string, skeyOutFilePath: string): Promise<Model.KeyPair> {
		const response = await Cmd.RunAsync(`${this.cliPath} address key-gen --verification-key-file ${vkeyOutFilePath} --signing-key-file ${skeyOutFilePath};`);
		if (response.stderr) {
			throw new Error(`Could not generate address key pair, error: ${response.stderr}`);
		}

		return {
			_vkeyFilePath: vkeyOutFilePath,
			_skeyFilePath: skeyOutFilePath,
		};
	}

	/**
	 * Build payment (wallet) address from given verification key.
	 *
	 * @param paymentVkeyFilePath vkey file path
	 * @param paymentAddressOutFilePath wallet address out file path
	 *
	 * @throws Error if something go wrong.
	 * @returns Generated payment address and its file path.
	 */
	async BuildPaymentAddressAsyncOrThrow(paymentVkeyFilePath: string, paymentAddressOutFilePath: string): Promise<Model.PaymentAddress> {
		// Generate payment address
		const response = await Cmd.RunAsync(`
			${this.cliPath} address build ${this.network} \
				--payment-verification-key-file ${paymentVkeyFilePath} \
				--out-file ${paymentAddressOutFilePath};
		`);

		if (response.stderr) {
			throw new Error(`Could not build payment address, error: ${response.stderr}`);
		}

		const paymentAddressContent = await DkFiles.ReadFileOrThrowAsync(paymentAddressOutFilePath);

		return {
			_paymentAddress: paymentAddressContent.trim(),
			_paymentAddressFilePath: paymentAddressOutFilePath
		};
	}

	/**
	 * Calculate key hash from given payment (wallet) vkey file.
	 *
	 * @param paymentVerificationKeyFilePath Normally it is policy vkey, payment address vkey,...
	 *
	 * @throws Error if something go wrong.
	 * @returns Key hash of given vkeyFilePath.
	 */
	async CalculateKeyHashOrThrow(paymentVerificationKeyFilePath: string): Promise<string> {
		const response = await Cmd.RunAsync(`${this.cliPath} address key-hash --payment-verification-key-file ${paymentVerificationKeyFilePath}`);
		if (response.stderr) {
			throw new Error(`Could not calculate key hash, error: ${response.stderr}`);
		}
		return response.stdout!.trim();
	}

	/**
	 * Generate policy id for an asset (token, NFT,...).
	 *
	 * @param policyScriptInFilePath Policy script file path.
	 * @param policyIdOutFilePath To be used to store generated policy id.
	 *
	 * @throws Error if something go wrong.
	 * @returns Generated policy id.
	 */
	async GeneratePolicyIdAsyncOrThrow(policyScriptInFilePath: string, policyIdOutFilePath: string): Promise<string> {
		// Generate policy id file
		const response = await Cmd.RunAsync(`${this.cliPath} transaction policyid --script-file ${policyScriptInFilePath} > ${policyIdOutFilePath};`);
		if (response.stderr) {
			throw new Error(`Could not generate policy, error: ${response.stderr}`);
		}

		// Read entire file content
		const policyId = await DkFiles.ReadFileOrThrowAsync(policyIdOutFilePath);

		return policyId.trim();
	}

	/**
	 * Generate protocol parameter file.
	 *
	 * @param protocolOutFilePath Where to write output.
	 *
	 * @throws Error if something go wrong.
	 */
	async GenerateProtocolParametersAsyncOrThrow(protocolOutFilePath: string): Promise<void> {
		// By default, `query` command uses --cardano-mode.
		const response = await Cmd.RunAsync(`${this.cliPath} query protocol-parameters ${this.network} --out-file ${protocolOutFilePath};`);
		if (response.stderr) {
			throw new Error(`Could not generate protocol, error: ${response.stderr}`);
		}
	}

	/**
	 * Query current tip at blockchain.
	 *
	 * @throws Error if something go wrong.
	 * @returns Tip in json object.
	 */
	async QueryTipAsyncOrThrow(): Promise<Model.QueryTipJsonResponse> {
		// By default, `query` command uses --cardano-mode.
		const response = await Cmd.RunAsync(`${this.cliPath} query tip ${this.network}`);
		if (response.stderr) {
			throw new Error(`Could not query tip, error: ${response.stderr}`);
		}
		return JSON.parse(response.stdout!);
	}


	/**
	 * Ensure given address is exist. Throws exception if the address is invalid.
	 *
	 * @param address Cardano address. For eg,. addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q
	 *
	 * @throws Error if the address is invalid (not exist in Cardano).
	 * @returns
	 */
	async EnsureAddressExistsAsync(address: string): Promise<void> {
		// By default, `query` command uses --cardano-mode.
		const response = await Cmd.RunAsync(`${this.cliPath} query utxo ${this.network} --address ${address};`);
		if (response.stderr) {
			throw new Error(`Could not touch address, error: ${response.stderr}`);
		}
	}

	/**
	 * Query utxo (balance) from given wallet.
	 *
	 * @param walletAddress For eg,. addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q
	 *
	 * @throws Error if something go wrong.
	 * @returns
	 */
	async QueryUtxoAsyncOrThrow(walletAddress: string): Promise<Model.Utxo[]> {
		const utxos: Model.Utxo[] = [];

		// Command: cardano-cli query utxo --address addr_test1vz2exa3va5pddrw33ldxtsnfpp4p0g92ep9np3fvz37a39saqac6q --testnet-magic 1097911063
		// UTXO result example:
		//                             TxHash                                 TxIx        Amount
		// --------------------------------------------------------------------------------------
		// 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     0        3414523 lovelace + TxOutDatumNone
		// 5291500d8b0b859625956de43370f2d2ceb46ba3189bca962ba954f6dc8dee7e     1        1400000 lovelace + 2 53806701cc6fa0bcbfbfd80962a4fb9978c50db79c516b3ba08e5470.756e646566696e6564 + TxOutDatumNone
		// a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     0        8413071 lovelace + TxOutDatumNone
		// a784adbd1878e3d58dae91aee6f76fef2a9940e7b336580b78d096c6e7723265     1        1400000 lovelace + 2 9c9388a408baa82362eef736adef5ea5bbc65c65ea5ac7f135571cc7.646b6e66745f7465737432 + TxOutDatumNone

		// By default, `query` command uses --cardano-mode.
		const response = await Cmd.RunAsync(`${this.cliPath} query utxo ${this.network} --address ${walletAddress};`);
		if (response.stderr) {
			throw new Error(`Could not query utxo, error: ${response.stderr}`);
		}
		const utxo_raw = response.stdout;
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
				const [quantity, asset_id] = segment.trim().split(DkConst.SPACE);

				// It is should not happen, but for safe, we should sum up.
				// TechNote: we use bigint instead of number (int53 in js) since quantity is int64.
				if (asset2quantity[asset_id]) {
					asset2quantity[asset_id] += BigInt(quantity);
				}
				else {
					asset2quantity[asset_id] = BigInt(quantity);
				}
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
	 * See command usage: cardano-cli transaction build-raw -h
	 *
	 * @param option
	 *
	 * @throws Error if something go wrong.
	 * @returns Tx raw body file path.
	 */
	async BuildRawTransactionAsyncOrThrow(option: Model.BuildRawTransactionOption): Promise<string> {
		const txInOption = await Helper._BuildTxInOptionAsync(option._txIns);
		const txOutOption = Helper._BuildTxOutOption(option._txOuts);
		const txInCollateralOption = option._txInCollateralOptions ? await Helper._BuildTxInOptionAsync(option._txInCollateralOptions, true) : DkConst.EMPTY_STRING;
		const mintOption = option._mintOptions ? await Helper._BuildMintOptionAsync(option._mintOptions) : DkConst.EMPTY_STRING;
		const withdrawalOption = option._withdrawalOptions ? await Helper._BuildWithdrawalOptionAsync(option._withdrawalOptions) : DkConst.EMPTY_STRING;
		const certsOption = option._certsOption ? await Helper._BuildCertOptionAsync(option._certsOption) : DkConst.EMPTY_STRING;
		const metadataOption = option._metadataOption ? await Helper._BuildMetadataOptionAsync(option._metadataOption) : DkConst.EMPTY_STRING;
		const auxScriptOpion = option._auxScriptOptions ? await Helper._BuildAuxScriptOptionAsync(option._auxScriptOptions) : DkConst.EMPTY_STRING;
		const scriptInvalidOption = option._scriptInvalid ? "--script-invalid" : DkConst.EMPTY_STRING;
		const invalidBeforeOption = option._invalidBefore ? `--invalid-before ${option._invalidBefore}` : DkConst.EMPTY_STRING;
		const invalidHereAfterOption = option._invalidAfter ? `--invalid-hereafter ${option._invalidAfter}` : DkConst.EMPTY_STRING;

		const response = await Cmd.RunAsync(`
			${this.cliPath} transaction build-raw ${this.era} \
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
		`);

		if (response.stderr) {
			throw new Error(`Could not build raw tx, error: ${response.stderr}`);
		}

		return option._txRawBodyOutFilePath;
	}

	/**
	 * Calculate min-fee of a transaction.
	 *
	 * @param option
	 *
	 * @throws Error if something go wrong.
	 * @returns Minimum fee in lovelace unit.
	 */
	async CalculateTransactionMinFeeAsyncOrThrow(option: Model.CalculateTransactionMinFeeOption): Promise<number> {
		const response = await Cmd.RunAsync(`
			${this.cliPath} transaction calculate-min-fee ${this.network} \
				--tx-body-file ${option._txRawBodyFilePath} \
				--tx-in-count ${option._txInCount} \
				--tx-out-count ${option._txOutCount} \
				--witness-count ${option._witnessCount} \
				--protocol-params-file ${option._protocolParametersFilePath}
		`);

		if (response.stderr) {
			throw new Error(`Could not calculate tx min-fee, error: ${response.stderr}`);
		}

		return parseInt(response.stdout!.trim().split(DkConst.SPACE)[0]);
	}

	/**
	 * Sign a transaction from tx raw body file.
	 * This will generate tx signed body file.
	 * In general, caller should build raw transaction before call this.
	 *
	 * @param option
	 *
	 * @throws Error if something go wrong.
	 * @returns Tx signed body out-file path.
	 */
	async SignTransactionAsyncOrThrow(option: Model.SignTransactionOption): Promise<string> {
		const signingKeyOption = option._skeyFilePaths.map(filePath => `--signing-key-file ${filePath}`).join(DkConst.SPACE);

		const response = await Cmd.RunAsync(`
			${this.cliPath} transaction sign ${this.network} \
				--tx-body-file ${option._txRawBodyFilePath} \
				${signingKeyOption} \
				--out-file ${option._txSignedBodyOutFilePath}
		`);

		if (response.stderr) {
			throw new Error(`Could not sign tx, error: ${response.stderr}`);
		}

		return option._txSignedBodyOutFilePath;
	}

	/**
	 * Submit a signed transaction.
	 *
	 * @param option
	 *
	 * @returns Command result.
	 */
	async SubmitTransactionAsync(option: Model.SubmitTransactionOption): Promise<RunCommandResult> {
		return await Cmd.RunAsync(`${this.cliPath} transaction submit ${this.network} --tx-file ${option._txSignedBodyFilePath}`);
	}

	/**
	 * Query tx id from the tx-body file path.
	 *
	 * @param option tx_raw_body_file_path
	 * @returns
	 */
	async QueryTransactionIdAsync(option: Model.QueryTransactionIdOption): Promise<string | null> {
		let txOption = DkConst.EMPTY_STRING;
		if (option._txFilePath) {
			txOption += `--tx-file ${option._txFilePath}`
		}
		if (option._txBodyFilePath) {
			txOption += `--tx-body-file ${option._txBodyFilePath}`;
		}

		if (!txOption) {
			throw new Error("Must provide path of: txFile or txBodyFile");
		}

		const response = await Cmd.RunAsync(`${this.cliPath} transaction txid ${txOption}`);

		return response.stdout == null ? null : response.stdout.trim();
	}
}
