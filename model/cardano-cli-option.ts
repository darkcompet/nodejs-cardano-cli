
export default class CardanoCliOption {
	// All generated folders will be located inside this folder.
	// For eg,. wallets, NFTs,...
	rootDirPath: string;
	network: string;
	cliPath: string;

	constructor(
		rootDirPath: string,
		network: string = "--testnet-magic 1097911063",
		cliPath: string,
	) {
		this.rootDirPath = rootDirPath;
		this.network = network;
		this.cliPath = cliPath;
	}
}
