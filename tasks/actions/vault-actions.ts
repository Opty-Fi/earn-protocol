import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { ethers } from "ethers";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";
import TASKS from "../task-names";
import { expect } from "chai";
import { getAddress } from "@ethersproject/address";
import { TypedTokens } from "../../helpers/data";

task(TASKS.ACTION_TASKS.VAULT_ACTIONS.NAME, TASKS.ACTION_TASKS.VAULT_ACTIONS.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("action", "deposit, withdraw or rebalance", "DEPOSIT" || "WITHDRAW" || "REBALANCE", types.string)
  .addParam("user", "account address of the user", "", types.string)
  .addOptionalParam("withrebalance", "do action with rebalance", true, types.boolean)
  .addOptionalParam("useall", "use whole balance", false, types.boolean)
  .addOptionalParam("amount", "amount of token", 0, types.int)
  .setAction(async ({ vault, action, user, withrebalance, amount, useall }, hre) => {
    const [owner] = await hre.ethers.getSigners();
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
      const vaultContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
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
          const timestamp = (await getBlockTimestamp(hre)) * 2;

          if (ethers.BigNumber.from(underlyingTokenBalance).lt(ethers.BigNumber.from(checkedAmount.toString()))) {
            console.log("Funding user with underlying token...");
            await fundWalletToken(hre, tokenAddress, owner, checkedAmount, timestamp, user);
          }
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
            const approveTx = await tokenContract.connect(userSigner).approve(vault, checkedAmount.toString());
            await approveTx.wait(1);
            const allowance = await tokenContract.allowance(user, vault);
            console.log(
              `Allowance : ${ethers.utils.formatUnits(ethers.BigNumber.from(allowance), tokenDecimals)} ${tokenSymbol}`,
            );
            if (withrebalance) {
              let strategyHash = await vaultContract.investStrategyHash();
              console.log(`Invest strategy : ${strategyHash}`);
              console.log(`depositing ${checkedAmount.toString()} with rebalance..`);
              const depositTx = await vaultContract.connect(userSigner).userDepositRebalance(checkedAmount.toString());
              await depositTx.wait(1);
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
            } else {
              const queue = await vaultContract.getDepositQueue();
              const balanceBefore = await tokenContract.balanceOf(vaultContract.address);
              const _tx = await vaultContract.connect(owner)[action.action](amount);
              const balanceAfter = await tokenContract.balanceOf(vaultContract.address);

              const tx = await _tx.wait(1);
              expect(tx.events[0].event).to.equal("Transfer");
              expect(tx.events[0].args[0]).to.equal(await owner.getAddress());
              expect(tx.events[0].args[1]).to.equal(vaultContract.address);
              expect(tx.events[0].args[2]).to.equal(balanceAfter.sub(balanceBefore));
              expect(tx.events[1].event).to.equal("DepositQueue");
              expect(tx.events[1].args[0]).to.equal(await owner.getAddress());
              expect(tx.events[1].args[1]).to.equal(queue.length + 1);
              expect(tx.events[1].args[2]).to.equal(balanceAfter.sub(balanceBefore));

              console.log("Deposit without rebalance successfully");
            }
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
            console.log(`withdrawing ${checkedAmount.toString()} with rebalance..`);
            const withdrawTx = await vaultContract.connect(userSigner).userWithdrawRebalance(checkedAmount.toString());
            await withdrawTx.wait(1);
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
