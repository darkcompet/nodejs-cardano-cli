
export interface CardanoCliOption {
	/**
	 * Path to cardano-cli command.
	 */
	_cliPath: string;

	/**
	 * For eg,. --mainnet, --testnet-magic 1097911063
	 */
	_network: string;

	/**
	 * One of below: --byron-era, --shelley-era, --allegra-era, --mary-era, --alonzo-era.
	 *
	 * See more: cardano-cli transaction build-raw
	 */
	_era?: string;
}

export interface MintOption {
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

export interface PolicyIdResult {
	_nftFilePath: string;
	_policyId: string;
}

export interface PolicyScriptResult {
	_slot: number | undefined;
	_keyHash: string | undefined;
}

export interface PolicyScriptJsonContent {
	slot: number;
	keyHash: string;
}

export interface BuildRawTransactionOption {
	_txInOptions: TxInOption[];
	_txOutOptions: TxOutOption[];
	_protocolParametersFilePath: string;

	_txInCollateralOptions?: TxInOption[];
	_mintOptions?: MintOption[];
	_withdrawalOptions?: WithdrawalOption[];
	_certsOption?: CertOption[];
	_metadataOption?: MetadataOption;
	_auxScriptOptions?: AuxScriptOption[];

	/**
	 * In lovelace unit.
	 */
	_fee?: number;

	/**
	 * To store out-file when building a raw transaction.
	 */
	_txRawBodyOutFilePath: string;
	_scriptInvalid?: any;
	_invalidAfter?: any;
	_invalidBefore?: any;
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
	_executionUnits?: Array<number>; // Only 2 elements
}

export interface MetadataOption {
	_metadataOutFilePath: string;
	_metadataOutContent: string;
}

export interface AuxScriptOption {
	_script: ScriptDetail;
}

export interface TxInOption {
	_txHash: string;
	_txIndex: number;
	_assets: Array<Asset>;

	_datum?: string;
	_datumHash?: string;
	_script?: ScriptDetail;
	_redeemer?: string;
	_executionUnits?: Array<number>; // Only 2 elements
}

export interface ScriptDetail {
	_outFilePath: string;
	_outContent: string;
}

export interface TxOutOption {
	/**
	 * Payment address??
	 */
	_address: string;

	/**
	 * Mapping of asset name to its quantity.
	 * For eg,. [
	 *   "lovelace": 30000000,
	 *   "mynft1": 20,
	 * ]
	 */
	_asset2quantity: any;

	_datumHash?: string;
}

export interface UtxoResult {
	_txHash: string;
	_txIndex: number;
	_datumHash: string;
	_assets: Asset[];
}

// For both ADA and non-ADA assets
export interface Asset {
	_name: string;
	_quantity: number;
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

export interface CalculateTransactionMinFeeOption {
	_protocolParametersFilePath: string;
	_txInCount: number;
	_txOutCount: number;
	_witnessCount: number;
	_txRawBodyFilePath: string;
}

export interface SignTransactionOption {
	_skeyFilePaths: string[];
	_txRawBodyFilePath: any;
	_txSignedBodyOutFilePath: any;
}

export interface SubmitTransactionOption1 {
	_txSignedBodyFilePath: string;
}

export interface QueryTransactionIdOption {
	_txFilePath?: string;
	_txBodyFilePath?: string;
}

export interface GeneratePolicyKeysResult {
	vkeyFilePath: string; // For verification
	skeyFilePath: string; // For signing
}
