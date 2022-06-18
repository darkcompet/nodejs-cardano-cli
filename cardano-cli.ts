import { randomUUID } from "node:crypto";
import DkCommands from "../nodejs-core/command";
import CardanoNodeOption from "./model/cardano-option";
import PolicyIdResult from "./model/policy-id-result";

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

export default class DkCardanoNode {
	cliPath: string;
	network: string;
	rootDirPath: string;

	constructor(option: CardanoNodeOption) {
		this.cliPath = option.cliPath;
		this.network = option.network;
		this.rootDirPath = option.rootDirPath;
	}

	/**
	 * @returns Policy id of the NFT.
	 */
	async GeneratePolicyId(): Promise<PolicyIdResult> {
		// [NFT folder structure]
		// Each nft will be put in different folder.
		const m_targetNftDirPath = `${this.rootDirPath}/nfts/${randomUUID()}`;

		// Fill slot number by slot value in generated 'policy/policy.script' file.
		const generatedPolicyIdResult = await DkCommands.RunAsync(`
			# Generate policy id to file
			${this.cliPath} transaction policyid --script-file ${m_targetNftDirPath}/${m_policyScriptRpath} > ${m_targetNftDirPath}/${m_policyIdRpath};

			# Display generated policy id.
			# Note: result here should be trimmed before use since it contains linefeed.
			cat ${m_targetNftDirPath}/${m_policyIdRpath};
		`);

		// Trim it since content from file may contain linefeed, whitespace...
		const m_policyId = generatedPolicyIdResult.stdout.trim();

		return {
			nftFilePath: "todo",
			policyId: m_policyId
		};
	}

	async QueryUtxo(walletAddress: string) {
		const utxo_result = await DkCommands.RunAsync(`
			${this.cliPath} query utxo --address ${walletAddress} ${this.network};
		`);

		const utxo_table = utxo_result.stdout;
		if (!utxo_table) {
			return null;
		}

		const utxo_rows = utxo_table.trim().split('\n');
		let utxo_txHash = undefined;
		let utxo_txIndex = undefined;
		let utxo_txLovelace = undefined;
		// Start read transaction history from row 3
		for (let index = 2, N = utxo_rows.length; index < N; ++index) {
			// Ignore empty char, or use split(/\s+/)
			const utxo_items = utxo_rows[index].trim().split(' ').filter((ch: any) => ch);
			utxo_txHash = utxo_items[0].trim();
			utxo_txIndex = utxo_items[1].trim();
			utxo_txLovelace = parseInt(utxo_items[2].trim());
		}

		return {};
	}
}
