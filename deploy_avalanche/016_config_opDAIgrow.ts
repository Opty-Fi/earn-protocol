import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { eEVMNetwork } from "../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { getRiskProfileCode, getUnpause } from "../helpers/utils";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
  const { BigNumber } = ethers;

  const networkName = eEVMNetwork.avalanche;
  // bit 0-15 deposit fee in underlying token without decimals 0000 (no fee)
  // bit 16-31 deposit fee in basis points 0000 (0% or 0 basis points)
  // bit 32-47 withdrawal fee in underlying token without decimals 0000 (no fee)
  // bit 48-63 withdrawal fee in basis points 000 (0% or 0 basis points)
  // bit 64-79 max vault value jump allowed in basis points (standard deviation allowed for vault value) 0064 (0.01% or 100 basis points)
  // bit 80-239 vault fee collection address 0000000000000000000000000000000000000000 (no address set)
  // bit 240-247 risk profile code 01
  // bit 248 emergency shutdown flag 0
  // bit 249 pause flag (deposit/withdraw is pause when bit is unset, unpause otherwise) 1
  // bit 250 white list state flag 1
  // bit 251-255 reserved 00000
  // 0x0601000000000000000000000000000000000000000000640000000000000000
  const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  // no whitelist state
  // 0x0201000000000000000000000000000000000000000000640000000000000000
  // const expectedConfig = BigNumber.from("906392544231311161076231617881117198619499239097192527361058388634069106688");
  const expectedUserDepositCapUT = BigNumber.from(ethers.constants.MaxUint256); // 2^256 DAI wei user deposit cap
  const expectedMinimumDepositValueUT = BigNumber.from("1000000000000000000"); // 1 DAI minimum deposit
  const expectedTotalValueLockedLimitUT = BigNumber.from("5000000000000000000000"); // 5000 DAI TVL limit
  const expectedAccountsRoot = "0x5497616cb86ca51b3788923a239cb626f3593a6395e3c66fe24b452204fbf875";
  const expectedRiskProfileCode = BigNumber.from("1");

  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opDAIgrowAddress = await (await deployments.get("opDAIgrow")).address; // fetches proxy address

  const opDAIgrowInstance = await ethers.getContractAt("Vault", opDAIgrowAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("set risk profile code for opDAIgrow");
  console.log("\n");
  const _vaultConfiguration_ = await opDAIgrowInstance.vaultConfiguration();
  if (expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    console.log("risk profile code  is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting risk profile code for opDAIgrow..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx1 = await opDAIgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx1.wait(1);
  }

  console.log("vaultConfiguration for opDAIgrow");
  console.log("\n");

  const _vaultConfiguration = await opDAIgrowInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opDAIgrow..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx2 = await opDAIgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx2.wait(1);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opDAIgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[networkName].DAI.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx3 = await opDAIgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[networkName].DAI.hash, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await tx3.wait(1);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opDAIgrow config...");
  console.log("\n");

  const actualUserDepositCapUT = await opDAIgrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opDAIgrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opDAIgrowInstance.totalValueLockedLimitUT();

  console.log("opDAIgrow.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opDAIgrow");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opDAIgrow...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx4 = await opDAIgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await tx4.wait(1);
  }

  console.log("unpause opDAIgrow");
  console.log("\n");
  const vaultConfiguration = await opDAIgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opDAIgrow vault...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx5 = await opDAIgrowInstance.connect(governanceSigner).setUnpaused(true, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx5.wait(1);
  } else {
    console.log("opDAIgrow is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opDAIgrow");
  console.log("\n");
  const actualAccountsRoot = await opDAIgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opDAIgrow vault...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx6 = await opDAIgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx6.wait(1);
  } else {
    console.log("whitelisted accounts root for opDAIgrow is as expected");
    console.log("\n");
  }
};
export default func;
func.tags = ["AvalancheConfigopDAIgrow"];
func.dependencies = ["AvalancheopDAIgrow", "AvalancheApproveAndMapLiquidityPoolToAdapter", "StrategyProvider"];
