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
	 * Default is: --alonzo-era
	 * To unset era, just provide empty string (not null).
	 */
	private readonly era: string;

	constructor(option: Model.ConstructOption) {
		this.cliPath = option._cliPath;
		this.network = option._network;
		this.era = option._era ?? "--alonzo-era";
	}

	/**
	 * Generate verification key and signing key of Cardano blockchain.
	 * It is required when we create new wallet, token, NFT,...
	 *
	 * @param vkeyOutFilePath OutFilePath for export verification key (.vkey)
	 * @param skeyOutFilePath OutFilePath for export signing key (.skey)
	 *
	 * @returns File paths of generated key pair.
	 */
	async GenerateAddressKeyPairAsync(vkeyOutFilePath: string, skeyOutFilePath: string): Promise<Model.KeyPair> {
		await Cmd.RunAsync(`${this.cliPath} address key-gen --verification-key-file ${vkeyOutFilePath} --signing-key-file ${skeyOutFilePath};`);

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
	 * @returns Generated payment address and its file path.
	 */
	async BuildPaymentAddressAsync(paymentVkeyFilePath: string, paymentAddressOutFilePath: string): Promise<Model.PaymentAddress> {
		// Generate payment address
		await Cmd.RunAsync(`
			${this.cliPath} address build ${this.network} \
				--payment-verification-key-file ${paymentVkeyFilePath} \
				--out-file ${paymentAddressOutFilePath};
		`);

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
	 * @returns Key hash of given vkeyFilePath.
	 */
	async CalculateKeyHash(paymentVerificationKeyFilePath: string): Promise<string> {
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
	 * @returns Generated policy id.
	 */
	async GeneratePolicyIdAsync(policyScriptInFilePath: string, policyIdOutFilePath: string): Promise<string> {
		// Generate policy id file
		await Cmd.RunAsync(`${this.cliPath} transaction policyid --script-file ${policyScriptInFilePath} > ${policyIdOutFilePath};`);

		// Read entire file content
		const policyId = await DkFiles.ReadFileOrThrowAsync(policyIdOutFilePath);

		return policyId.trim();
	}

	/**
	 * Generate protocol parameter file.
	 *
	 * @param protocolOutFilePath Where to write output.
	 * @returns Generated protocol parameters file path.
	 */
	async GenerateProtocolParametersAsync(protocolOutFilePath: string): Promise<string> {
		// By default, `query` command uses --cardano-mode.
		await Cmd.RunAsync(`${this.cliPath} query protocol-parameters ${this.network} --out-file ${protocolOutFilePath};`);

		return protocolOutFilePath;
	}

	/**
	 * Query current tip at blockchain.
	 *
	 * @returns Tip in json object.
	 */
	async QueryTipAsync(): Promise<Model.QueryTipJsonResponse> {
		// By default, `query` command uses --cardano-mode.
		const response = await Cmd.RunAsync(`${this.cliPath} query tip ${this.network}`);
		return JSON.parse(response.stdout!);
	}

	/**
	 * Query utxo (balance) from given wallet.
	 *
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

		// By default, `query` command uses --cardano-mode.
		const utxo_result = await Cmd.RunAsync(`${this.cliPath} query utxo ${this.network} --address ${walletAddress};`);
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
				const [quantity, asset] = segment.trim().split(DkConst.SPACE);

				// It is should not happen, but for safe, we should sum up.
				if (!asset2quantity[asset]) {
					asset2quantity[asset] = 0;
				}
				asset2quantity[asset] += parseInt(quantity);
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
	 * @returns Tx raw body file path.
	 */
	async BuildRawTransactionAsync(option: Model.BuildRawTransactionOption): Promise<string> {
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

		await Cmd.RunAsync(`
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

		return option._txRawBodyOutFilePath;
	}

	/**
	 * Calculate min-fee of a transaction.
	 *
	 * @param option
	 * @returns Minimum fee in lovelace unit.
	 */
	async CalculateTransactionMinFeeAsync(option: Model.CalculateTransactionMinFeeOption): Promise<number> {
		const response = await Cmd.RunAsync(`
			${this.cliPath} transaction calculate-min-fee ${this.network} \
				--tx-body-file ${option._txRawBodyFilePath} \
				--tx-in-count ${option._txInCount} \
				--tx-out-count ${option._txOutCount} \
				--witness-count ${option._witnessCount} \
				--protocol-params-file ${option._protocolParametersFilePath}
		`);

		if (response.stderr) {
			throw new Error(`Failed to calculate min-fee, error: ${response.stderr}`);
		}

		return parseInt(response.stdout!.trim().split(DkConst.SPACE)[0]);
	}

	/**
	 * Sign a transaction from tx raw body file.
	 * This will generate tx signed body file.
	 * In general, caller should build raw transaction before call this.
	 *
	 * @param option
	 * @returns Tx signed body out-file path.
	 */
	async SignTransactionAsync(option: Model.SignTransactionOption): Promise<string> {
		const signingKeyOption = option._skeyFilePaths.map(filePath => `--signing-key-file ${filePath}`).join(DkConst.SPACE);

		await Cmd.RunAsync(`
			${this.cliPath} transaction sign ${this.network} \
				--tx-body-file ${option._txRawBodyFilePath} \
				${signingKeyOption} \
				--out-file ${option._txSignedBodyOutFilePath}
		`);

		return option._txSignedBodyOutFilePath;
	}

	/**
	 * Submit a signed transaction.
	 *
	 * @param option
	 * @returns Command result.
	 */
	async SubmitTransactionAsync(option: Model.SubmitTransactionOption): Promise<RunCommandResult> {
		return await Cmd.RunAsync(`${this.cliPath} transaction submit ${this.network} --tx-file ${option._txSignedBodyFilePath}`);
	}

	/**
	 * Query tx id from the tx-body file path.
	 *
	 * @param option tx_signed_body_file_path
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
			throw new Error("Must provide one of: txFilePath or txBodyFilePath");
		}

		const response = await Cmd.RunAsync(`${this.cliPath} transaction txid ${txOption}`);

		return response.stdout;
	}
}
