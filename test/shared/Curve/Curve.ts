import { ethers } from "ethers";
import * as OtherImports from "../OtherImports";

export async function swapLpMappingAndSetGauge(
    optyCodeProviderContractsKey: string,
    optyCodeProviderContract: any,
    ownerWallet: any,
    overrideOptions: any
) {
    //  Setting/Mapping the liquidityPoolToken, SwapPoolTOUnderlyingTokens and gauge address as pre-requisites in CurveSwapCodeProvider
    let curveSwapDataProviderKey: keyof typeof OtherImports.curveSwapDataProvider;
    for (curveSwapDataProviderKey in OtherImports.curveSwapDataProvider) {
        if (
            curveSwapDataProviderKey.toString().toLowerCase() ==
            optyCodeProviderContractsKey.toString().toLowerCase()
        ) {
            const tokenPairs =
                OtherImports.curveSwapDataProvider[curveSwapDataProviderKey];
            let tokenPair: keyof typeof tokenPairs;
            for (tokenPair in tokenPairs) {
                const _liquidityPoolToken = tokenPairs[tokenPair].liquidityPoolToken;
                const _swapPool = tokenPairs[tokenPair].swapPool;
                const _guage = tokenPairs[tokenPair].gauge;
                const _underlyingTokens = tokenPairs[tokenPair].underlyingTokens;

                const optyCodeProviderContractOwnerSigner = optyCodeProviderContract.connect(
                    ownerWallet
                );

                //  Mapping lpToken to swapPool contract
                await optyCodeProviderContractOwnerSigner.functions.setLiquidityPoolToken(
                    _swapPool,
                    _liquidityPoolToken,
                    overrideOptions
                );

                //  Mapping UnderlyingTokens to SwapPool Contract
                await optyCodeProviderContract.setSwapPoolToUnderlyingTokens(
                    _swapPool,
                    _underlyingTokens,
                    overrideOptions
                );

                //  Mapping Gauge contract to the SwapPool Contract
                await optyCodeProviderContract.setSwapPoolToGauges(
                    _swapPool,
                    _guage,
                    overrideOptions
                );
            }
        }
    }
}
