import { ethers } from "ethers";

export const DYDXCODEPROVIDER = "dydxcodeprovider";
export const AAVEV1CODEPROVIDER = "aavev1codeprovider";
export const FULCRUMCODEPROVIDER = "fulcrumcodeprovider";
export const YVAULTCODEPROVIDER = "yvaultcodeprovider";
export const AAVEV2CODEPROVIDER = "aavev2codeprovider";
export const YEARNCODEPROVIDER = "yearncodeprovider";
export const CURVESWAPCODEPROVIDER = "curveswapcodeprovider";
export const MNEMONIC =
    "misery entire skirt bridge limit shy south tomato tip spatial home rich";
export const INITIAL_ACCOUNT_BALANCE_ETHER = 20000;
export const MAINNET_NODE_URL: string = process.env.MAINNET_NODE_URL as string;
export const PWD: string = process.env.PWD as string;
export const ACCOUNTS = 21;
export const UNLOCK_ACCOUNTS = true;
export const GAS_OVERRIDE_OPTIONS: ethers.providers.TransactionRequest = {
    gasLimit: 6721975,
};
export const ETH_VALUE_GAS_OVERIDE_OPTIONS = {
    value: ethers.utils.hexlify(ethers.utils.parseEther("9500")),
    gasLimit: 6721975,
};
