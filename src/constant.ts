
class _Const {
	// Consider: ADA is coin, lovelace is token.
	readonly LOVELACE = "lovelace";

	// 1 ADA = 10^6 lovelace.
	readonly ADA_COIN2TOKEN = 1000000;

	// Action (mint, burn)
	readonly ACTION_MINT = "mint";
	readonly ACTION_BURN = "burn";
}

export const DkCardanoConst = new _Const();
