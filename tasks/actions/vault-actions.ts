import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { ethers } from "ethers";
import TASKS from "../task-names";
import { getAddress } from "@ethersproject/address";
import { TypedTokens } from "../../helpers/data";
import { Vault } from "../../typechain";
import { getAllowWhitelistState } from "../../helpers/utils";

task(TASKS.ACTION_TASKS.VAULT_ACTIONS.NAME, TASKS.ACTION_TASKS.VAULT_ACTIONS.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("action", "deposit, withdraw or rebalance", "DEPOSIT" || "WITHDRAW" || "REBALANCE", types.string)
  .addParam("user", "account address of the user", "", types.string)
  .addParam("merkleProof", "user merkle proof", "", types.string)
  .addOptionalParam("useall", "use whole balance", false, types.boolean)
  .addOptionalParam("amount", "amount of token", 0, types.int)
  .setAction(async ({ vault, action, user, amount, useall, merkleProof }, hre) => {
    const ACTIONS = ["DEPOSIT", "WITHDRAW", "REBALANCE"];
    if (vault === "") {
      throw new Error("vault cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    if (user === "") {
      throw new Error("user cannot be empty");
    }

    if (!isAddress(user)) {
      throw new Error("user address is invalid");
    }

    if (!ACTIONS.includes(action.toUpperCase())) {
      throw new Error("action is invalid");
    }

    if (!useall && amount <= 0 && action.toUpperCase() != "REBALANCE") {
      throw new Error("amount is not set");
    }

    try {
      const userSigner = await hre.ethers.getSigner(user);
      const vaultContract = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const vaultShareSymbol = await vaultContract.symbol();
      const vaultShareDecimals = await vaultContract.decimals();
      const tokenAddress = await vaultContract.underlyingToken();
      const tokenContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, tokenAddress);
      const tokenSymbol = tokenAddress == getAddress(TypedTokens.MKR) ? "MKR" : await tokenContract.symbol();
      const tokenDecimals = await tokenContract.decimals();

      switch (action.toUpperCase()) {
        case "DEPOSIT": {
          let checkedAmount = amount;
          let underlyingTokenBalance = await tokenContract.balanceOf(user);
          underlyingTokenBalance = await tokenContract.balanceOf(user);
          console.log(
            `Underlying token : ${ethers.utils.formatUnits(
              ethers.BigNumber.from(underlyingTokenBalance),
              tokenDecimals,
            )} ${tokenSymbol}`,
          );
          if (useall) {
            checkedAmount = await tokenContract.balanceOf(user);
          }
          try {
            const allowance = await tokenContract.allowance(user, vault);
            console.log(
              `Allowance : ${ethers.utils.formatUnits(ethers.BigNumber.from(allowance), tokenDecimals)} ${tokenSymbol}`,
            );
            if (allowance.lt(checkedAmount)) {
              console.log("Approving...");
              const approveTx = await tokenContract.connect(userSigner).approve(vault, checkedAmount.sub(allowance));
              await approveTx.wait(1);
              const allowanceAfter = await tokenContract.allowance(user, vault);
              console.log(
                `AllowanceAfter : ${ethers.utils.formatUnits(
                  ethers.BigNumber.from(allowanceAfter),
                  tokenDecimals,
                )} ${tokenSymbol}`,
              );
            }

            let strategyHash = await vaultContract.investStrategyHash();
            console.log(`Invest strategy : ${strategyHash}`);
            console.log(`depositing ${checkedAmount.toString()}..`);
            if (getAllowWhitelistState(await vaultContract.vaultConfiguration())) {
              const depositTx = await vaultContract
                .connect(userSigner)
                .userDepositVault(checkedAmount, JSON.parse(merkleProof), []);
              await depositTx.wait(1);
            } else {
              const depositTx = await vaultContract.connect(userSigner).userDepositVault(checkedAmount, [], []);
              await depositTx.wait(1);
            }
            const vaultShareBalance = await vaultContract.balanceOf(user);
            strategyHash = await vaultContract.investStrategyHash();
            console.log(`Invest strategy : ${strategyHash}`);
            console.log(
              `Vault Shares : ${ethers.utils.formatUnits(
                ethers.BigNumber.from(vaultShareBalance),
                vaultShareDecimals,
              )} ${vaultShareSymbol}`,
            );
            const underlyingTokenBalance = await tokenContract.balanceOf(user);
            console.log(
              `Underlying token : ${ethers.utils.formatUnits(
                ethers.BigNumber.from(underlyingTokenBalance),
                tokenDecimals,
              )} ${tokenSymbol}`,
            );
          } catch (error) {
            throw new Error(`#deposit : ${error}`);
          }

          break;
        }
        case "WITHDRAW": {
          let checkedAmount = amount;
          if (useall) {
            checkedAmount = await vaultContract.balanceOf(user);
          }
          try {
            let strategyHash = await vaultContract.investStrategyHash();
            console.log(`Invest strategy : ${strategyHash}`);
            const underlyingTokenBalanceBefore = await tokenContract.balanceOf(user);
            console.log(
              `Underlying token balance before : ${ethers.utils.formatUnits(
                ethers.BigNumber.from(underlyingTokenBalanceBefore),
                tokenDecimals,
              )} ${tokenSymbol}`,
            );
            console.log(`withdrawing ${checkedAmount.toString()} with rebalance..`);

            if (getAllowWhitelistState(await vaultContract.vaultConfiguration())) {
              const withdrawTx = await vaultContract
                .connect(userSigner)
                .userWithdrawVault(checkedAmount, JSON.parse(merkleProof), []);
              await withdrawTx.wait(1);
            } else {
              const withdrawTx = await vaultContract.connect(userSigner).userWithdrawVault(checkedAmount, [], []);
              await withdrawTx.wait(1);
            }

            const vaultShareBalance = await vaultContract.balanceOf(user);
            strategyHash = await vaultContract.investStrategyHash();
            console.log(`Invest strategy : ${strategyHash}`);
            console.log(
              `Vault Shares : ${ethers.utils.formatUnits(
                ethers.BigNumber.from(vaultShareBalance),
                vaultShareDecimals,
              )} ${vaultShareSymbol}`,
            );
            const underlyingTokenBalance = await tokenContract.balanceOf(user);
            console.log(
              `Underlying token : ${ethers.utils.formatUnits(
                ethers.BigNumber.from(underlyingTokenBalance),
                tokenDecimals,
              )} ${tokenSymbol}`,
            );
          } catch (error) {
            throw new Error(`#withdraw : ${error}`);
          }

          break;
        }
        case "REBALANCE": {
          try {
            let strategyHash = await vaultContract.investStrategyHash();
            console.log(`Invest strategy : ${strategyHash}`);
            console.log("Rebalancing..");
            await vaultContract.connect(userSigner).rebalance();
            strategyHash = await vaultContract.investStrategyHash();
            console.log(`Invest strategy : ${strategyHash}`);
            console.log("Rebalance successfully");
          } catch (error) {
            throw new Error(`#rebalance : ${error}`);
          }
          break;
        }
      }
      console.log("Finished executing Vault actions");
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.VAULT_ACTIONS.NAME}: `, error);
      throw error;
    }
  });
