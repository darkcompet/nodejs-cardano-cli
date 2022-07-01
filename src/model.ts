
export interface ConstructOption {
	/**
	 * Path to cardano-cli command.
	 */
	_cliPath: string;

	/**
	 * For eg,. --mainnet, --testnet-magic 1097911063
	 */
	_network: string;
}

export interface TxIn {
	_txHash: string;
	_txIndex: number;

	/**
	 * For eg,. {
	 *   "lovelace": 1000000,
	 *   "mynft1": 3
	 * }
	 */
	_asset2quantity: any;

	_datum?: string;
	_datumHash?: string;
	_script?: ScriptDetail;
	_redeemer?: string;
	_executionUnits?: number[]; // Only 2 elements
}

export interface TxOut {
	/**
	 * Payment address.
	 */
	_address: string;

	/**
	 * Mapping of asset name to its quantity.
	 * For eg,. {
	 *   "lovelace": 30000000,
	 *   "mynft1": 20,
	 * }
	 */
	_asset2quantity: any;

	_datumHash?: string;
}

export interface Utxo {
	_txHash: string;
	_txIndex: number;
	_datumHash: string;

	/**
	 * Mapping for both ADA and non-ADA assets.
	 * For eg,. {
	 *   "lovelace": 1000000,
	 *   "mynft1": 3
	 * }
	 */
	_asset2quantity: any;
}

export interface ScriptDetail {
	_outFilePath: string;
	_outContent: string;
}

export interface WalletInfo {
	/**
	 * For eg,. {
	 *   "lovelace": 1400000,
	 *   "mynft1": 2,
	 * }
	 */
	_balance: any;
	_utxos: Utxo[];
}

// Do NOT change property names since they are fixed.
export interface QueryTipJsonResponse {
	era: string; // "Alonzo"
	syncProgress: string; // "100.00"
	hash: string; // "d8f81718bb1a293b83148a6a94fd25c1c61b58405911273c4e59d0c09eef30a4"
	epoch: number; // 212
	slot: number; // 61352931
	block: number; // 3645785
}

export interface MintInfo {
	/**
	 * One of: mint, burn
	 */
	_action: string;
	_assetNameInHex: string;
	_assetQuantity: number;
	_policyScriptFilePath: string;

	_redeemer?: string;
	_executionUnits?: Array<number>; // Only 2 elements
}

export interface KeyPair {
	_vkeyFilePath: string; // For verification
	_skeyFilePath: string; // For signing
}

export interface PaymentAddress {
	_paymentAddress: string;
	_paymentAddressFilePath: string;
}

export interface BuildRawTransactionOption {
	_txIns: TxIn[];
	_txOuts: TxOut[];
	_protocolParametersFilePath: string;

	/**
	 * To store out-file when building a raw transaction.
	 */
	_txRawBodyOutFilePath: string;

	/**
	 * In lovelace unit.
	 */
	_fee: number;

	_txInCollateralOptions?: TxIn[];
	_mintOptions?: MintInfo[];
	_withdrawalOptions?: WithdrawalOption[];
	_certsOption?: CertOption[];
	_metadataOption?: MetadataOption;
	_auxScriptOptions?: AuxScriptOption[];

	_scriptInvalid?: boolean;
	_invalidBefore?: number;
	_invalidAfter?: number;

	_era?: string;
}

export interface WithdrawalOption {
	_reward: any;
	_stakingAddress: any;

	_datum?: string;
	_redeemer?: string;
	_executionUnits?: any;
	_scriptOutFilePath: string;
	_scriptOutContent?: string;
}

export interface CertOption {
	_cert: any;

	_script?: ScriptDetail;
	_datum?: string;
	_redeemer?: string;
	_executionUnits?: number[]; // Only 2 elements
}

export interface MetadataOption {
	_metadataOutFilePath: string;
	_metadataOutContent: string;
}

export interface AuxScriptOption {
	_script: ScriptDetail;
}

export interface CalculateTransactionMinFeeOption {
	_protocolParametersFilePath: string;

	/**
	 * Number of inputs be used in the transaction.
	 */
	_txInCount: number;

	/**
	 * Number of outputs be used in the transaction.
	 */
	_txOutCount: number;

	/**
	 * Number of Shelley key signings (witnesses) be used in the transaction.
	 */
	_witnessCount: number;

	/**
	 * Use this for calculate bytes of the transaction.
	 */
	_txRawBodyFilePath: string;
}

export interface SignTransactionOption {
	_skeyFilePaths: string[];
	_txRawBodyFilePath: string;
	_txSignedBodyOutFilePath: string;
}

export interface SubmitTransactionOption {
	_txSignedBodyFilePath: string;
}

export interface QueryTransactionIdOption {
	_txFilePath?: string;
	_txBodyFilePath?: string;
}
