import { Contract, ethers } from "ethers";
const abi = require("ethereumjs-abi");

export async function approveToken(token: string, optyRegistry: Contract) {
    const tokenStatus = await optyRegistry.tokens(token);
    if (!tokenStatus) {
        await optyRegistry.approveToken(token);
    }
}
//  Function to approve the LpTokens as tokens and underlyingTokens from tokens list
export async function approveTokenLpToken(
    lpToken: string,
    tokens: string[],
    optyRegistry: Contract
) {
    // Note: May need this if lpToken is null/empty down the road - Deepanshu
    // if (!!lpToken || lpToken.length > 0) {
    if (lpToken != "0x0000000000000000000000000000000000000000") {
        await approveToken(lpToken, optyRegistry);
    }

    if (tokens.length > 0) {
        tokens.forEach(async (token) => {
            await approveToken(token, optyRegistry);
        });
    }
}

//  Function to set the hash for the list of underlying tokens
export async function setTokensHashToTokens(tokens: string[], optyRegistry: Contract) {
    const tokensHash = "0x" + abi.soliditySHA3(["address[]"], [tokens]).toString("hex");
    const tokensHashIndex: ethers.BigNumber = await optyRegistry.tokensHashToTokens(
        tokensHash
    );
    //  Get tokens corresponding to tokensHash from contract (if any)
    const tokensFromContract = await optyRegistry.getTokensHashToTokens(tokensHash);
    if (tokensHashIndex.eq(0) && tokensFromContract.length == 0) {
        const setTokensHashTx = await optyRegistry.setTokensHashToTokens(tokens);
        const setTokensHashTxOutput = await setTokensHashTx.wait();
        return setTokensHashTxOutput;
    }
}

//  Function to approve the liquidity/credit pool and map the Lp to the CodeProvider Contract
export async function approveLpCpAndMapLpToCodeProvider(
    pool: string,
    codeProvider: string,
    isBorrow: boolean,
    optyRegistry: Contract
) {
    let liquidityPools = await optyRegistry.liquidityPools(pool);
    const creditPools = await optyRegistry.creditPools(pool);
    if (!liquidityPools.isLiquidityPool) {
        await optyRegistry.approveLiquidityPool(pool);
    }
    liquidityPools = await optyRegistry.liquidityPools(pool);
    if (!creditPools.isLiquidityPool) {
        await optyRegistry.approveCreditPool(pool);
    }
    if (isBorrow) {
        await optyRegistry.setLiquidityPoolToBorrowPoolProxy(pool, codeProvider);
    } else {
        await optyRegistry.setLiquidityPoolToCodeProvider(pool, codeProvider);
    }
}
