import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { FETCH_STRATEGIES } from "../task-names";
import { createDir, createFile } from "../../helpers/utils";
import axios, { Method } from "axios";
import Web3 from "web3";
task(FETCH_STRATEGIES, "Fetch strategies from moralis")
  .addParam("token", "the address of token", "", types.string)
  .setAction(async ({ token }, hre) => {
    if (!isAddress(token)) {
      throw new Error(`token is invalid`);
    }
    try {
      const erc20Contract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, token);

      const BASE_DATA_OPTIONS = {
        _ApplicationId: process.env.MORALIS_APP_ID,
        _ClientVersion: "js0.0.120",
        _InstallationId: "a4e82bcc-1ef9-4379-a92f-59f2ecd557db",
      };
      createDir("/.opty-sdk/ethereum");

      const config = {
        method: "get" as Method,
        url: `${process.env.MORALIS_SERVER_URL}/functions/getStrategiesForUnderlyingTokens`,
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          chain: "0x1",
          underlyingTokens: [Web3.utils.toChecksumAddress(token)],
          ...BASE_DATA_OPTIONS,
        }),
      };

      const response = await axios(config);
      createFile(`.opty-sdk/ethereum/${await erc20Contract.symbol()}.json`, JSON.stringify(response.data.result));
    } catch (error: any) {
      console.error(`${FETCH_STRATEGIES}: `, error.response ? error.response.data : error);
    }
  });
