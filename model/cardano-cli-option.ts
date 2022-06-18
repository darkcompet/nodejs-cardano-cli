
export default class CardanoCliOption {
	network: string;
	cliPath: string;

	constructor(
		network: string = "--testnet-magic 1097911063",
		cliPath: string,
	) {
		this.network = network;
		this.cliPath = cliPath;
	}
}
