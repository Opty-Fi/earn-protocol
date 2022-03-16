import data from "../optyfi-sdk/config";
import { NETWORKS, NETWORKS_ID } from "../helpers/constants/network";
import { createDir, createFile, getMoralisConfig } from "../helpers/utils";
import { DEFI_POOL_DATA /*STRATEGIES, STRATEGY_DATA*/ } from "../helpers/type";
// import { ETH } from "../helpers/constants/utils";
// import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

// import { TypedTokens } from "../helpers/data";
// import hre from "hardhat";

import { bold } from "./common";
import axios, { Method } from "axios";

const dirPath = `node_modules/optyfi-sdk`;

async function main() {
  const networks = Object.keys(data).map(item => item as NETWORKS_ID);
  for (let i = 0; i < networks.length; i++) {
    const networkID = networks[i];
    const network = NETWORKS[networkID];
    const networkData = data[networkID];
    if (networkData) {
      const networkPath = `${dirPath}/${network.network}`;
      createDir(`/${networkPath}`);
      if (networkData.protocols) {
        console.log(bold("Fetching Defi Pools"));
        console.log("--------------------------------");
        const poolPath = `${dirPath}/${network.network}/pools`;
        createDir(`/${poolPath}`);

        for (let i = 0; i < networkData.protocols.length; i++) {
          const protocol = networkData.protocols[i];
          console.log(`Fetching all defi pools for ${bold(protocol)} protocol from Moralis...`);
          const response = await axios(
            getMoralisConfig("get" as Method, "getDefiPools", {
              chain: networkID,
              adapterName: protocol,
            }),
          );
          const data = response.data.result;
          const defiPools: DEFI_POOL_DATA = {};
          for (let i = 0; i < data.adapterPools.length; i++) {
            const pool = data.adapterPools[i];
            defiPools[pool.poolName] = {
              pool: pool.poolAddress,
              lpToken: pool.lpTokenAddress,
              tokens: pool.underlyingTokens,
              rewardTokens: pool.rewardTokens,
            };
          }
          createFile(`${poolPath}/${protocol}.json`, JSON.stringify(defiPools));
          console.log(`✅ Fetched defi pools for ${protocol} successfully.`);
        }
        console.log("--------------------------------");
      }

      // TODO : fix strategy fetching
      // if (networkData.strategies) {
      //   console.log(bold("Fetching strategies"));

      //   const strategyPath = `${dirPath}/${network.network}/strategies`;
      //   createDir(`/${strategyPath}`);
      //   const tokens = Object.keys(networkData.strategies);
      //   for (let i = 0; i < tokens.length; i++) {
      //     const token = tokens[i];
      //     console.log(`Fetching strategies for ${token} from Moralis...`);
      //     const response = await axios(
      //       getMoralisConfig("get" as Method, "getStrategiesForUnderlyingTokens", {
      //         chain: "0x1",
      //         underlyingTokens: [networkData.strategies[token]],
      //       }),
      //     );
      //     const data = response.data.result;
      //     const strategies: STRATEGIES = {};
      //     for (let i = 0; i < data.length; i++) {
      //       const steps = data[i].strategySteps;

      //       let strategyName: string = token ? token : "";
      //       const strategyData: STRATEGY_DATA[] = [];
      //       for (let i = 0; i < steps.length; i++) {
      //         const step = steps[i];

      //         const lpToken = step.lpToken === ETH ? TypedTokens["WETH"] : step.outputToken;
      //         const lpContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, lpToken);

      //         let lpTokenSymbol = lpToken;
      //         try {
      //           lpTokenSymbol = lpToken !== hre.ethers.constants.AddressZero ? await lpContract.symbol() : "";
      //         } catch (error: any) {
      //           //A token like MKR does not return string type on call to symbol() or name() function
      //           if (error.message !== "Transaction reverted without a reason string") {
      //             throw error;
      //           }
      //         }

      //         strategyName = `${strategyName}-${step.isBorrow ? "BORROW" : "DEPOSIT"}-${step.adapterName}${
      //           lpTokenSymbol ? "-" + lpTokenSymbol : ""
      //         }`;
      //         strategyData.push({
      //           contract: step.pool,
      //           outputToken: step.outputToken,
      //           isBorrow: step.isBorrow,
      //           outputTokenSymbol: lpTokenSymbol,
      //           adapterName: `${step.adapterName}Adapter`,
      //           protocol: step.protocol,
      //         });
      //       }
      //       strategies[strategyName] = {
      //         strategyName,
      //         token: networkData.strategies[token],
      //         strategy: strategyData,
      //       };
      //     }
      //     createFile(`${strategyPath}/${token}.json`, JSON.stringify(strategies));
      //     console.log(`✅ Fetched strategies for ${token} successfully.`);
      //   }
      // }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
