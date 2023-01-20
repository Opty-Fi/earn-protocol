import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { getAddress } from "@ethersproject/address";
import { TypedTokens } from "../../helpers/data";
import { Vault } from "../../typechain";
import { getAllowWhitelistState } from "../../helpers/utils";
import { BigNumber } from "ethers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";

task(TASKS.ACTION_TASKS.VAULT_ACTIONS.NAME, TASKS.ACTION_TASKS.VAULT_ACTIONS.DESCRIPTION)
  .addParam("vaultSymbol", "the symbol of vault", "", types.string)
  .addParam(
    "action",
    "deposit, withdraw or rebalance",
    "DEPOSIT" || "WITHDRAW" || "REBALANCE" || "VAULT-DEPOSIT-ALL-TO-STRATEGY",
    types.string,
  )
  .addParam("user", "account address of the user", "", types.string)
  .addParam("merkleProof", "user merkle proof", "", types.string)
  .addOptionalParam("beneficiary", "beneficiary of DEPOSIT or WITHDRAW", "", types.string)
  .addOptionalParam("useAll", "use whole balance", false, types.boolean)
  .addOptionalParam("amount", "amount of token", "0", types.string)
  .setAction(
    async ({ vaultSymbol, action, user, beneficiary, amount, useAll, merkleProof }, { ethers, deployments }) => {
      const ACTIONS = ["DEPOSIT", "WITHDRAW", "REBALANCE", "VAULT-DEPOSIT-ALL-TO-STRATEGY"];

      if (!ACTIONS.includes(action.toUpperCase())) {
        throw new Error("action is invalid");
      }

      if (!useAll && !BigNumber.from(amount).gt("0") && action.toUpperCase() != "REBALANCE") {
        throw new Error("amount is not set");
      }

      try {
        const vault = (await deployments.get(`${vaultSymbol}_Proxy`)).address;
        const userSigner = await ethers.getSigner(user);
        const vaultContract = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
        const vaultShareSymbol = await vaultContract.symbol();
        const vaultShareDecimals = await vaultContract.decimals();
        const tokenAddress = await vaultContract.underlyingToken();
        const tokenContract = await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, tokenAddress);
        const tokenSymbol = tokenAddress == getAddress(TypedTokens.MKR) ? "MKR" : await tokenContract.symbol();
        const tokenDecimals = await tokenContract.decimals();

        switch (action.toUpperCase()) {
          case "DEPOSIT": {
            let checkedAmount = ethers.BigNumber.from(amount.toString());
            let underlyingTokenBalance = await tokenContract.balanceOf(user);
            underlyingTokenBalance = await tokenContract.balanceOf(user);
            console.log(
              `Underlying token : ${ethers.utils.formatUnits(
                ethers.BigNumber.from(underlyingTokenBalance),
                tokenDecimals,
              )} ${tokenSymbol}`,
            );
            if (useAll) {
              checkedAmount = await tokenContract.balanceOf(user);
            }
            try {
              const allowance = await tokenContract.allowance(user, vault);
              console.log(
                `Allowance : ${ethers.utils.formatUnits(
                  ethers.BigNumber.from(allowance),
                  tokenDecimals,
                )} ${tokenSymbol}`,
              );
              if (allowance.lt(checkedAmount)) {
                console.log("Approving...");
                const approveTx = await tokenContract
                  .connect(userSigner)
                  .approve(vault, ethers.BigNumber.from(checkedAmount).sub(allowance));
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
              console.log(`depositing ${checkedAmount.toString()}...`);
              console.log("Block before : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply before : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share before : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
              if (getAllowWhitelistState(await vaultContract.vaultConfiguration())) {
                const depositTx = await vaultContract
                  .connect(userSigner)
                  .userDepositVault(beneficiary, checkedAmount, [], merkleProof.split(","));
                await depositTx.wait(1);
              } else {
                const depositTx = await vaultContract
                  .connect(userSigner)
                  .userDepositVault(beneficiary, checkedAmount, [], []);
                await depositTx.wait(1);
              }
              console.log("Block after : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply after : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share after : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
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
            let checkedAmount = ethers.BigNumber.from(amount.toString());
            if (useAll) {
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
              console.log("Block before : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply before : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share before : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
              if (getAllowWhitelistState(await vaultContract.vaultConfiguration())) {
                const gasLimit = await vaultContract
                  .connect(userSigner)
                  .estimateGas.userWithdrawVault(beneficiary, checkedAmount, merkleProof.split(","));
                const withdrawTx = await vaultContract
                  .connect(userSigner)
                  .userWithdrawVault(beneficiary, checkedAmount, merkleProof.split(","), {
                    gasLimit: gasLimit.add("1000000"),
                  });
                await withdrawTx.wait(1);
              } else {
                const gasLimit = await vaultContract
                  .connect(userSigner)
                  .estimateGas.userWithdrawVault(beneficiary, checkedAmount, []);
                const withdrawTx = await vaultContract
                  .connect(userSigner)
                  .userWithdrawVault(beneficiary, checkedAmount, [], {
                    gasLimit: gasLimit.add("1000000"),
                  });
                await withdrawTx.wait(1);
              }
              console.log("Block after : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply after : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share after : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
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
              console.log("Block before : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply before : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share before : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
              const gasLimit = await vaultContract.connect(userSigner).estimateGas.rebalance();
              const tx3 = await vaultContract.connect(userSigner).rebalance({ gasLimit: gasLimit.add("1000000") });
              await tx3.wait(1);
              console.log("Block after : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply after : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share after : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
              strategyHash = await vaultContract.investStrategyHash();
              console.log(`Invest strategy : ${strategyHash}`);
              console.log("Rebalance successfully");
            } catch (error) {
              throw new Error(`#rebalance : ${error}`);
            }
            break;
          }
          case "VAULT-DEPOSIT-ALL-TO-STRATEGY": {
            try {
              let strategyHash = await vaultContract.investStrategyHash();
              console.log(`Invest strategy : ${strategyHash}`);
              console.log("Depositing all to strategy..");
              console.log("Block before : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply before : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share before : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
              const gasLimit = await vaultContract.connect(userSigner).estimateGas.vaultDepositAllToStrategy();
              const tx3 = await vaultContract
                .connect(userSigner)
                .vaultDepositAllToStrategy({ gasLimit: gasLimit.add("1000000") });
              await tx3.wait(1);
              console.log("Block after : ", await ethers.provider.getBlockNumber());
              console.log(
                "total supply after : ",
                ethers.utils.formatUnits(await vaultContract.totalSupply(), tokenDecimals),
              );
              console.log(
                "Price per full share after : ",
                ethers.utils.formatEther(await vaultContract.getPricePerFullShare()),
              );
              strategyHash = await vaultContract.investStrategyHash();
              console.log(`Invest strategy : ${strategyHash}`);
              console.log("vaultDepositAllToStrategy successfully");
            } catch (error) {
              throw new Error(`#vaultDepositAllToStrategy : ${error}`);
            }
            break;
          }
        }
        console.log("Finished executing Vault actions");
      } catch (error) {
        console.error(`${TASKS.ACTION_TASKS.VAULT_ACTIONS.NAME}: `, error);
        throw error;
      }
    },
  );
