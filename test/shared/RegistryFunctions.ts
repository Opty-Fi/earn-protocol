import { Contract, ethers } from "ethers";
const abi = require("ethereumjs-abi");

export async function approveToken(token: string, optyRegistry: Contract) {
    let tokenStatus = await optyRegistry.tokens(
        token
    );
    if (!tokenStatus) {
        await optyRegistry.approveToken(
            token
        );
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
        await approveToken(lpToken, optyRegistry)
        // let lpTokenApproveStatus = await optyRegistry.tokens(lpToken);

        // if (!lpTokenApproveStatus) {
        //     await optyRegistry.approveToken(lpToken);
        // }
    }

    if (tokens.length > 0) {
        tokens.forEach(async (token) => {
            await approveToken(token, optyRegistry)
            // let tokenApproveStatus = await optyRegistry.tokens(token);
            // if (!tokenApproveStatus) {
            //     await optyRegistry.approveToken(token);
            // }
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
    //  Get tokens corresponding to tokensHash from contract (if any)
    let tokensFromContract = await optyRegistry.getTokensHashToTokens(tokensHash)
        console.log("tokens length: ", tokensFromContract.length)
    if (
            tokensHashIndex.eq(0) && (tokensFromContract.length == 0)
        ) {
        // tokensHash !==
            // "0x50440c05332207ba7b1bb0dcaf90d1864e3aa44dd98a51f88d0796a7623f0c80"
        console.log("Setting tokens hash..")
        console.log("tokensHashIndex: ", tokensHashIndex)
        console.log("46: tokens: ", tokens)
        const setTokensHashTx = await optyRegistry.setTokensHashToTokens(tokens);
        // console.log("46: set receipt: ", setTokensHashTx)
        const setTokensHashTxOutput = await setTokensHashTx.wait();
        // console.log("Output post setting: ", setTokensHashTxOutput)
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
        await optyRegistry.setLiquidityPoolToCodeProvider(pool, codeProvider);
    }
}
