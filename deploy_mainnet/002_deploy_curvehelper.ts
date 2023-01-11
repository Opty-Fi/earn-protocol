import hre from "hardhat";
import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress, parseEther } from "ethers/lib/utils";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import Curve from "@optyfi/defi-legos/ethereum/curve/index";
import { CurveHelper, CurveHelper__factory, ERC20, ERC20__factory, Registry } from "../typechain";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("CurveHelper");
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const registryInstance = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const chainId = await getChainId();
  const networkName = network.name;

  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("CurveHelper", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const curvehelper = await deployments.get("CurveHelper");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "CurveHelper",
          address: curvehelper.address,
          constructorArguments: [registryProxyAddress],
          contract: "CurveHelper",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "CurveHelper",
          address: curvehelper.address,
          constructorArguments: [registryProxyAddress],
          contract: "CurveHelper",
        });
      }
    }
  }

  const approvalTokens = [];
  const approvalSpender = [];

  const curveHelperInstance = <CurveHelper>(
    await ethers.getContractAt(CurveHelper__factory.abi, (await deployments.get("CurveHelper")).address)
  );

  const usdcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);

  const usdcThreeCrvAllowance = await usdcInstance.allowance(
    curveHelperInstance.address,
    Curve.CurveSwapPool.usdc_3crv.pool,
  );

  if (!usdcThreeCrvAllowance.gt(parseEther("1000000"))) {
    approvalTokens.push(usdcInstance.address);
    approvalSpender.push(Curve.CurveSwapPool.usdc_3crv.pool);
  }

  if (approvalTokens.length > 0) {
    console.log(`${approvalTokens.length} tokens to approve ...`, approvalTokens);
    console.log(`${approvalSpender.length} spender to spend ...`, approvalSpender);
    const riskOperatorSigner = await hre.ethers.getSigner(await registryInstance.getRiskOperator());
    if (getAddress(riskOperatorSigner.address) === getAddress(deployer)) {
      const tx = await curveHelperInstance.connect(riskOperatorSigner).giveAllowances(approvalTokens, approvalSpender, {
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
      await tx.wait(1);
    } else {
      console.log("cannot approve pools as signer is not the governance");
    }
  }
};
export default func;
func.tags = ["CurveHelper"];
func.dependencies = ["Registry"];
