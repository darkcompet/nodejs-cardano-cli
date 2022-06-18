
export default class PolicyIdResult {
	nftFilePath: string;
	policyId: string;

	constructor(
		nftFilePath: string,
		policyId: string,
	) {
		this.nftFilePath = nftFilePath;
		this.policyId = policyId;
	}
}
