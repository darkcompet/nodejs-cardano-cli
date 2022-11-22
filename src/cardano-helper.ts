import { Utxo } from "./model";

export class DkCardanoHelper {
	/**
	 * Convert given UTXOs to wallet balance.
	 *
	 * @param utxos UTXOs of a wallet.
	 * @returns Sum up of asset2quantity, for eg,. { "lovelace": 120, "token1": 1000, "mynft2": 3 }
	 */
	static Utxo2Balance(utxos: Utxo[]): any {
		// Mapping of asset with its total quantity
		const balance: any = {};

		for (const utxo of utxos) {
			for (const asset in utxo._asset2quantity) {
				if (balance[asset]) {
					balance[asset] += utxo._asset2quantity[asset];
				}
				else {
					balance[asset] = utxo._asset2quantity[asset];
				}
			}
		}

		return balance;
	}
}
