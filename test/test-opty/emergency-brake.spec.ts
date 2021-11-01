import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { VAULT_TOKENS, TESTING_CONTRACTS, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import { deployVault, deployEssentialContracts } from "../../helpers/contracts-deployments";
import {
  approveAndSetTokenHashToToken,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/emergency-brake.json";
describe(scenario.title, () => {
  const token = "DAI";
  const MAX_AMOUNT = 100000000;
  let essentialContracts: CONTRACTS;
  let owner: Signer;
  let admin: Signer;
  before(async () => {
    try {
      [owner, admin] = await hre.ethers.getSigners();
      essentialContracts = await deployEssentialContracts(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.vaults.length; i++) {
    describe(`${scenario.vaults[i].name}`, async () => {
      let Vault: Contract;
      let underlyingTokenName: string;
      let underlyingTokenSymbol: string;
      const vault = scenario.vaults[i];
      const profile = vault.riskProfileCode;
      let ERC20Instance: Contract;
      let emergencyBrake: Contract;
      before(async () => {
        try {
          await approveAndSetTokenHashToToken(owner, essentialContracts.registry, VAULT_TOKENS[token]);
          const timestamp = (await getBlockTimestamp(hre)) * 2;
          await fundWalletToken(hre, VAULT_TOKENS[token], owner, BigNumber.from(MAX_AMOUNT * 100), timestamp);
          underlyingTokenName = await getTokenName(hre, token);
          underlyingTokenSymbol = await getTokenSymbol(hre, token);
          Vault = await deployVault(
            hre,
            essentialContracts.registry.address,
            VAULT_TOKENS[token],
            owner,
            admin,
            underlyingTokenName,
            underlyingTokenSymbol,
            profile,
            TESTING_DEPLOYMENT_ONCE,
          );

          await unpauseVault(owner, essentialContracts.registry, Vault.address, true);
          await Vault.connect(owner).setMaxVaultValueJump(vault.maxJump);

          const EmergencyBrakeFactory = await hre.ethers.getContractFactory(TESTING_CONTRACTS.TESTING_EMERGENCY_BRAKE);
          emergencyBrake = await EmergencyBrakeFactory.deploy(Vault.address, VAULT_TOKENS[token]);

          ERC20Instance = await hre.ethers.getContractAt("ERC20", VAULT_TOKENS[token]);
          await ERC20Instance.connect(owner).transfer(emergencyBrake.address, MAX_AMOUNT * 2);
        } catch (error: any) {
          console.error(error);
        }
      });

      for (let i = 0; i < vault.stories.length; i++) {
        const story = vault.stories[i];
        it(story.description, async () => {
          for (let j = 0; j < story.actions.length; j++) {
            if (story.actions[j].action === "runDepositRebalance(uint256)") {
              const { amount } = story.actions[j].args;
              if (story.actions[j].expect === "success") {
                await emergencyBrake[story.actions[j].action](amount);
              } else {
                await expect(emergencyBrake[story.actions[j].action](amount)).to.be.revertedWith(
                  story.actions[j].message,
                );
              }
            } else {
              const { max_amount, min_amount } = story.actions[j].args;
              if (story.actions[j].expect === "success") {
                await emergencyBrake[story.actions[j].action](min_amount, max_amount);
              } else {
                await expect(emergencyBrake[story.actions[j].action](min_amount, max_amount)).to.be.revertedWith(
                  story.actions[j].message,
                );
              }
            }
          }
          for (let j = 0; j < story.cleanActions.length; j++) {
            const action = story.cleanActions[j];
            switch (action.action) {
              case "runWithdrawAllRebalance()": {
                if (action.expect === "success") {
                  await emergencyBrake[action.action]();
                } else {
                  await expect(emergencyBrake[action.action]()).to.be.revertedWith(action.message);
                }
                break;
              }
            }
          }
        }).timeout(100000);
      }
    });
  }
});
