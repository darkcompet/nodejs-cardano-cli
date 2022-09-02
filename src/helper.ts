import { DkConst } from "@darkcompet/js-core";
import { DkFiles } from "@darkcompet/nodejs-core";
import { DkCardanoConst } from "./constant";
import * as Model from "./model";

export class Helper {
	static async _BuildTxInOptionAsync(txIns: Model.TxIn[], isCollateral: boolean = false): Promise<string> {
		let result = DkConst.EMPTY_STRING;

		for (const option of txIns) {
			result += ` --tx-in${isCollateral ? "-collateral" : ""} ${option._txHash}#${option._txIndex}`;

			if (option._script) {
				if (!option._script._outFilePath || !option._script._outContent) {
					throw new Error("Script file path and content are needed");
				}
				await DkFiles.WriteFileOrThrowAsync(option._script._outFilePath, option._script._outContent);
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
	static _BuildTxOutOption(txOuts: Model.TxOut[]): string {
		let result = DkConst.EMPTY_STRING;

		for (let index = 0, N = txOuts.length; index < N; ++index) {
			const txOutOption = txOuts[index];

			// For ADA asset (lovelace)
			if (!txOutOption._asset2quantity[DkCardanoConst.LOVELACE]) {
				throw new Error("Must send some lovelaces");
			}
			result += ` --tx-out ${txOutOption._address}+${txOutOption._asset2quantity[DkCardanoConst.LOVELACE]}`;

			// For non-ADA asset (NFT,...)
			let nonAdaAssetOption = DkConst.EMPTY_STRING;
			for (const asset in txOutOption._asset2quantity) {
				if (asset != DkCardanoConst.LOVELACE) {
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

	static async _BuildMintOptionAsync(options: Array<Model.MintInfo>): Promise<string> {
		// [Build --mint]
		// For burn, just add - before asset quantity.
		// For eg,. --mint="1 policyidA.mynftA+5 policyidB.mynftB+-2 policyidC.mynftC"
		let result = `--mint="`;

		for (let index = 0, lastIndex = options.length - 1; index <= lastIndex; ++index) {
			const option = options[index];
			const ok = (option._action == "mint" || option._action == "burn") && option._assetId && option._assetQuantity;
			if (!ok) {
				throw new Error("Must provide valid: action, asset, quantity");
			}

			// In theory, for Mint we add (+), for Burn we subtract (-).
			// By default, don't need add + for minting.
			const plus = index < lastIndex ? "+" : "";
			result += `${option._action == "mint" ? "" : "-"}${option._assetQuantity} ${option._assetId}${plus}`;
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

	static async _BuildWithdrawalOptionAsync(options: Model.WithdrawalOption[]): Promise<string> {
		let result = DkConst.EMPTY_STRING;

		for (const option of options) {
			result += ` --withdrawal ${option._stakingAddress}+${option._reward}`;

			if (option._scriptOutContent) {
				await DkFiles.WriteFileOrThrowAsync(option._scriptOutFilePath, option._scriptOutContent);
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

	static async _BuildCertOptionAsync(options: Model.CertOption[]): Promise<string> {
		let result = DkConst.EMPTY_STRING;

		for (const option of options) {
			result += ` --certificate ${option._cert}`;

			if (option._script) {
				await DkFiles.WriteFileOrThrowAsync(option._script._outFilePath, option._script._outContent);
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

	static async _BuildMetadataOptionAsync(option: Model.MetadataOption): Promise<string> {
		await DkFiles.WriteFileOrThrowAsync(option._metadataOutFilePath, option._metadataOutContent);

		const metadataInFilePath = option._metadataOutFilePath;

		return `--metadata-json-file ${metadataInFilePath}`;
	}

	static async _BuildAuxScriptOptionAsync(options: Model.AuxScriptOption[]) {
		let result = DkConst.EMPTY_STRING;

		for (const option of options) {
			await DkFiles.WriteFileOrThrowAsync(option._script._outFilePath, option._script._outContent);
			result += ` --auxiliary-script-file ${option._script._outFilePath}`;
		}

		return result.trimStart();
	}
}
