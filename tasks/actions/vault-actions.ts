import { task, types } from "hardhat/config";
import { getContractInstance, isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { ethers } from "ethers";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";

task("vault-actions", "perform actions in Vault")
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

    const userSigner = await hre.ethers.getSigner(user);

    const vaultContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.VAULT, vault);
    const vaultShareSymbol = await vaultContract.symbol();
    const vaultShareDecimals = await vaultContract.decimals();

    const tokenAddress = await vaultContract.underlyingToken();

    const tokenContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.ERC20, tokenAddress);
    const tokenSymbol = await tokenContract.symbol();
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
            console.log("depositing with rebalance..");
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
            await vaultContract.connect(userSigner).userDeposit(checkedAmount.toString());
            console.log("Deposit without rebalance successfully");
          }
        } catch (error) {
          console.log(`Got error when depositing : ${error}`);
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
          console.log("withdrawing with rebalance..");
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
          console.log(`Got error when withdrawing : ${error}`);
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
          console.log(`Got error when rebalancing : ${error}`);
        }
        break;
      }
    }

    console.log("Finished executing Vault actions");
  });
