import { Contract, ethers } from "ethers";
const abi = require("ethereumjs-abi");

//  Function to approve the LpTokens as tokens and underlyingTokens from tokens list
export async function approveTokenLpToken(
    lpToken: string,
    tokens: string[],
    optyRegistry: Contract
) {
    // Note: May need this if lpToken is null/empty down the road - Deepanshu
    // if (!!lpToken || lpToken.length > 0) {
    if (lpToken != "0x0000000000000000000000000000000000000000") {
        let lpTokenApproveStatus = await optyRegistry.tokens(lpToken);
        if (!lpTokenApproveStatus) {
            console.log("Approving LpToken: ", lpToken);
            await optyRegistry.approveToken(lpToken);
        }
    }

    console.log("STep-1 approve");
    if (tokens.length > 0) {
        console.log("step2 approve");
        tokens.forEach(async (token) => {
            console.log("step3 approve");
            let tokenApproveStatus = await optyRegistry.tokens(token);
            if (!tokenApproveStatus) {
                console.log("Approving token: ", token);
                await optyRegistry.approveToken(token);
            }
        });
    }
}

//  Function to set the hash for the list of underlying tokens
export async function setTokensHashToTokens(tokens: string[], optyRegistry: Contract) {
    let tokensHash = "0x" + abi.soliditySHA3(["address[]"], [tokens]).toString("hex");
    // let tokensHashIndex: ethers.utils.BigNumber = await optyRegistry.tokensHashToTokens(
    //     tokensHash
    // );
    let tokensHashIndex: ethers.BigNumber = await optyRegistry.tokensHashToTokens(
        tokensHash
    );
    if (
        tokensHashIndex.eq(0) &&
        tokensHash !==
            "0x50440c05332207ba7b1bb0dcaf90d1864e3aa44dd98a51f88d0796a7623f0c80"
    ) {
        console.log("Tokens Hash generated from SHA3 lib: ", tokensHash);
        const setTokensHashTx = await optyRegistry.setTokensHashToTokens(tokens);
        const setTokensHashTxOutput = await setTokensHashTx.wait();
        console.log("set Tokens hash output from contract: ", setTokensHashTxOutput);
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
    let creditPools = await optyRegistry.creditPools(pool);
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
        console.log("Mapping code provider to lp");
        await optyRegistry.setLiquidityPoolToCodeProvider(pool, codeProvider);
    }
}
