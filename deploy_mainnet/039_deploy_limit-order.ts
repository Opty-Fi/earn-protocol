import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("LimitOrder");
  const oracle = await deployments.get("OptyFiOracle");
  const Gelato_Ops = "0xB3f5503f93d5Ef84b06993a1975B9D21B962892F"; // mainnet
  const treasury = "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6";
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("LimitOrder", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [treasury, oracle.address, Gelato_Ops],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const LimitOrder = await deployments.get("LimitOrder");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "LimitOrder",
          address: LimitOrder.address,
          args: [treasury, oracle.address, Gelato_Ops],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "LimitOrder",
          address: LimitOrder.address,
          args: [treasury, oracle.address, Gelato_Ops],
        });
      }
    }
  }
};
export default func;
func.tags = ["LimitOrder"];
