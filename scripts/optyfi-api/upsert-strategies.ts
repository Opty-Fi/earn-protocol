import { getAddress } from "@ethersproject/address";
import axios from "axios";
import { network, getChainId, ethers } from "hardhat";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { generateStrategyHashV2 } from "../../helpers/helpers";

async function main() {
  const loginResponse = await axios.post(`${process.env.OPTYFI_API_URL}/login`, {
    username: process.env.OPTYFI_API_USERNAME,
    password: process.env.OPTYFI_API_PASSWORD,
  });
  const jwtToken = loginResponse.data;
  const networkName = network.name;
  const chainId = await getChainId();
  let blockchain;
  switch (chainId) {
    case "1":
      blockchain = "Ethereum";
      break;
    case "137":
      blockchain = "Polygon";
      break;
    default:
      throw new Error("unsupported chain");
  }
  for (const riskProfile of Object.keys(StrategiesByTokenByChain[networkName])) {
    for (const token of Object.keys(StrategiesByTokenByChain[networkName][riskProfile])) {
      const tokensHash = MULTI_CHAIN_VAULT_TOKENS[chainId][token].hash;
      console.log("\n\n");
      console.log(`tokenSymbol ${token} - `, tokensHash);
      for (const strategy of Object.keys(StrategiesByTokenByChain[networkName][riskProfile][token])) {
        const strategyHash = generateStrategyHashV2(
          StrategiesByTokenByChain[chainId][riskProfile][token][strategy].strategy,
          tokensHash,
        );
        try {
          console.log("\n");
          const strategyResponse = await axios.get(
            `${process.env.OPTYFI_API_URL}/v1/yield/strategy/strategy_hash/${strategyHash}`,
          );
          if (strategyResponse.statusText !== "OK") {
            console.log(`Failed ${strategy} : `, strategyHash);
            // POST strategy
          } else {
            console.log(`found ${strategy} : `, strategyHash);
            try {
              if (
                !(
                  strategyResponse.data.strategy_name ===
                    StrategiesByTokenByChain[networkName][riskProfile][token][strategy].name &&
                  strategyResponse.data.strategy_description ===
                    StrategiesByTokenByChain[networkName][riskProfile][token][strategy].description
                )
              ) {
                if (
                  strategyResponse.data.strategy_name === null ||
                  strategyResponse.data.strategy_description === null
                ) {
                  if (
                    StrategiesByTokenByChain[networkName][riskProfile][token][strategy].name !== null ||
                    StrategiesByTokenByChain[networkName][riskProfile][token][strategy].description !== null
                  ) {
                    // PUT strategy
                    const strategyPutResponse = await axios.put(
                      `${process.env.OPTYFI_API_URL}/v1/yield/strategy/name_description/strategy_hash/${strategyHash}`,
                      {
                        ...(typeof StrategiesByTokenByChain[networkName][riskProfile][token][strategy].name ===
                          "string" && {
                          name: StrategiesByTokenByChain[networkName][riskProfile][token][strategy].name,
                        }),
                        ...(typeof StrategiesByTokenByChain[networkName][riskProfile][token][strategy].description ===
                          "string" && {
                          description: StrategiesByTokenByChain[networkName][riskProfile][token][strategy].description,
                        }),
                      },
                      {
                        headers: {
                          Authorization: jwtToken,
                        },
                      },
                    );
                    if (strategyPutResponse.statusText === "OK") {
                      console.log("PUT SUCCESS");
                    } else {
                      console.log("PUT FAILED");
                    }
                  } else {
                    console.log("Name and description are not available");
                  }
                } else {
                  console.log("Name and description found");
                }
              } else {
                console.log("Upto date");
              }
            } catch (error) {
              console.log("PUT Errored ", error);
            }
          }
        } catch (error: any) {
          if (error.response.statusText === "Not Found") {
            console.log(`POST ${strategy} : `, strategyHash);
            try {
              const strategyPostResponse = await axios.post(
                `${process.env.OPTYFI_API_URL}/v1/yield/strategy`,
                [
                  {
                    blockchain,
                    strategy_hash: strategyHash,
                    ...(typeof StrategiesByTokenByChain[networkName][riskProfile][token][strategy].name ===
                      "string" && {
                      name: StrategiesByTokenByChain[networkName][riskProfile][token][strategy].name,
                    }),
                    ...(typeof StrategiesByTokenByChain[networkName][riskProfile][token][strategy].description ===
                      "string" && {
                      description: StrategiesByTokenByChain[networkName][riskProfile][token][strategy].description,
                    }),
                    risk_profile: StrategiesByTokenByChain[chainId][riskProfile][token][strategy].riskProfileCode,
                    num_steps: StrategiesByTokenByChain[chainId][riskProfile][token][strategy].strategy.length,
                    strategy_steps: StrategiesByTokenByChain[chainId][riskProfile][token][strategy].strategy.map(
                      (x, i) => ({
                        ...(getAddress(x.contract) === getAddress("0x52D306e36E3B6B02c153d0266ff0f85d18BCD413") && {
                          protocol_contract_address: x.contract,
                        }),
                        ...(getAddress(x.contract) === getAddress("0x24a42fD28C976A61Df5D00D0599C34c4f90748c8") && {
                          protocol_contract_address: x.contract,
                        }),
                        ...(getAddress(x.contract) !== getAddress("0x52D306e36E3B6B02c153d0266ff0f85d18BCD413") &&
                          getAddress(x.contract) !== getAddress("0x24a42fD28C976A61Df5D00D0599C34c4f90748c8") && {
                            pool_address: x.contract,
                          }),
                        input_token_address:
                          i == 0
                            ? StrategiesByTokenByChain[chainId][riskProfile][token][strategy].token
                            : StrategiesByTokenByChain[chainId][riskProfile][token][strategy].strategy[i - 1]
                                .outputToken,
                        output_token_address:
                          getAddress(x.outputToken) === ethers.constants.AddressZero ? null : x.outputToken,
                        is_borrow: x.isBorrow,
                      }),
                    ),
                  },
                ],
                {
                  headers: {
                    Authorization: jwtToken,
                  },
                },
              );
              if (strategyPostResponse.statusText !== "OK") {
                console.log("POST failed");
              } else {
                if (strategyPostResponse.data.errors.length > 0) {
                  console.log("POST failed");
                  console.log(JSON.stringify(strategyPostResponse.data, null, 4));
                } else {
                  console.log("POST succeed");
                }
              }
            } catch (error) {
              console.log("POST errored ", error);
            }
          } else {
            throw error;
          }
        }
      }
    }
  }
}

main().then(console.log).catch(console.error);
