import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import sushiswap from "@optyfi/defi-legos/polygon/sushiswap/index";
import quickswap from "@optyfi/defi-legos/polygon/quickswap/index";
import apeswap from "@optyfi/defi-legos/polygon/apeswap/index";
import { getAddress } from "ethers/lib/utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";
import { ERC20, ERC20__factory, Vault, Vault__factory } from "../typechain";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

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
  const { deployer, admin } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("Vault");
  const artifactVaultProxyV2 = await deployments.getArtifact("AdminUpgradeabilityProxy");
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const commandBuilder = await deployments.get("CommandBuilder");
  const registryInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("opUSDC-Earn", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    libraries: {
      "contracts/protocol/lib/CommandBuilder.sol:CommandBuilder": commandBuilder.address,
    },
    proxy: {
      owner: admin,
      upgradeIndex: networkName == "hardhat" ? 0 : 2,
      proxyContract: {
        abi: artifactVaultProxyV2.abi,
        bytecode: artifactVaultProxyV2.bytecode,
        deployedBytecode: artifactVaultProxyV2.deployedBytecode,
      },
      execute: {
        init: {
          methodName: "initialize",
          args: [
            registryProxyAddress, //address _registry
            MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash, //bytes32 _underlyingTokensHash
            "0x4a7e14b2b81abccd2dfd58372f0cbd5b5512749fbafee2e2cda5c56ac0fc947a", //bytes32 _whitelistedAccountsRoot
            "USDC", //string memory _symbol
            "1", //uint256 _riskProfileCode
            "907136802102229675083754464877550363794833538656521846974622833684986724352", //uint256 _vaultConfiguration
            "100000000000", //uint256 _userDepositCapUT
            "0", //uint256 _minimumDepositValueUT
            "10000000000000", //uint256 _totalValueLockedLimitUT
          ],
        },
        onUpgrade: {
          methodName: "initialize",
          args: [
            registryProxyAddress, //address _registry
            MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash, //bytes32 _underlyingTokensHash
            "0x4a7e14b2b81abccd2dfd58372f0cbd5b5512749fbafee2e2cda5c56ac0fc947a", //bytes32 _whitelistedAccountsRoot
            "USDC", //string memory _symbol
            "1", //uint256 _riskProfileCode
            "907136802102229675083754464877550363794833538656521846974622833684986724352", //uint256 _vaultConfiguration
            "100000000000", //uint256 _userDepositCapUT
            "0", //uint256 _minimumDepositValueUT
            "10000000000000", //uint256 _totalValueLockedLimitUT
          ],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opUSDC-Earn");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opUSDC-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opUSDC-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }

  const vaultInstance = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSDC-Earn")).address)
  );

  const approvalTokens: string[] = [];
  const approvalSpender: string[] = [];

  const usdc = <ERC20>await ethers.getContractAt(ERC20__factory.abi, polygonTokens.USDC);
  const usdcAllowance = await usdc.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!usdcAllowance.gt("0")) {
    approvalTokens.push(usdc.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const usdt = <ERC20>await ethers.getContractAt(ERC20__factory.abi, polygonTokens.USDT);
  const usdtAllowance = await usdt.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!usdtAllowance.gt("0")) {
    approvalTokens.push(usdt.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const dai = <ERC20>await ethers.getContractAt(ERC20__factory.abi, polygonTokens.DAI);
  const daiAllowance = await dai.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!daiAllowance.gt("0")) {
    approvalTokens.push(dai.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const usdcUsdtSLP = await ethers.getContractAt(ERC20__factory.abi, "0x4B1F1e2435A9C96f7330FAea190Ef6A7C8D70001");
  const usdcUsdtSLPAllowance = await usdcUsdtSLP.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!usdcUsdtSLPAllowance.gt("0")) {
    approvalTokens.push(usdcUsdtSLP.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const usdcDaiSLP = await ethers.getContractAt(ERC20__factory.abi, "0xCD578F016888B57F1b1e3f887f392F0159E26747");
  const usdcDaiSLPAllowance = await usdcDaiSLP.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!usdcDaiSLPAllowance.gt("0")) {
    approvalTokens.push(usdcDaiSLP.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const usdcAllowanceQLP = await usdc.allowance(vaultInstance.address, quickswap.QuickswapRouter.address);
  if (!usdcAllowanceQLP.gt("0")) {
    approvalTokens.push(usdc.address);
    approvalSpender.push(quickswap.QuickswapRouter.address);
  }

  const usdtAllowanceQLP = await usdt.allowance(vaultInstance.address, quickswap.QuickswapRouter.address);
  if (!usdtAllowanceQLP.gt("0")) {
    approvalTokens.push(usdt.address);
    approvalSpender.push(quickswap.QuickswapRouter.address);
  }

  const daiAllowanceQLP = await dai.allowance(vaultInstance.address, quickswap.QuickswapRouter.address);
  if (!daiAllowanceQLP.gt("0")) {
    approvalTokens.push(dai.address);
    approvalSpender.push(quickswap.QuickswapRouter.address);
  }

  const usdcUsdtQLP = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0x2cF7252e74036d1Da831d11089D326296e64a728")
  );
  const usdcUsdtQLPAllowance = await usdcUsdtQLP.allowance(vaultInstance.address, quickswap.QuickswapRouter.address);
  if (!usdcUsdtQLPAllowance.gt("0")) {
    approvalTokens.push(usdcUsdtQLP.address);
    approvalSpender.push(quickswap.QuickswapRouter.address);
  }

  const usdcDaiQLP = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd")
  );
  const usdcDaiQLPAllowance = await usdcDaiQLP.allowance(vaultInstance.address, quickswap.QuickswapRouter.address);
  if (!usdcDaiQLPAllowance.gt("0")) {
    approvalTokens.push(usdcDaiQLP.address);
    approvalSpender.push(quickswap.QuickswapRouter.address);
  }

  const mai = <ERC20>await ethers.getContractAt(ERC20__factory.abi, polygonTokens.MIMATIC);
  const maiAllowanceQLP = await mai.allowance(vaultInstance.address, quickswap.QuickswapRouter.address);
  if (!maiAllowanceQLP.gt("0")) {
    approvalTokens.push(mai.address);
    approvalSpender.push(quickswap.QuickswapRouter.address);
  }

  const usdcMaiQLP = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0x160532D2536175d65C03B97b0630A9802c274daD")
  );
  const usdcMaiQLPAllowance = await usdcMaiQLP.allowance(vaultInstance.address, quickswap.QuickswapRouter.address);
  if (!usdcMaiQLPAllowance.gt("0")) {
    approvalTokens.push(usdcMaiQLP.address);
    approvalSpender.push(quickswap.QuickswapRouter.address);
  }

  const usdcAllowanceALP = await usdc.allowance(vaultInstance.address, apeswap.ApeswapRouter.address);
  if (!usdcAllowanceALP.gt("0")) {
    approvalTokens.push(usdc.address);
    approvalSpender.push(apeswap.ApeswapRouter.address);
  }

  const daiAllowanceALP = await dai.allowance(vaultInstance.address, apeswap.ApeswapRouter.address);
  if (!daiAllowanceALP.gt("0")) {
    approvalTokens.push(dai.address);
    approvalSpender.push(apeswap.ApeswapRouter.address);
  }

  const usdcDaiALP = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0x5b13B583D4317aB15186Ed660A1E4C65C10da659")
  );
  const usdcDaiALPAllowance = await usdcDaiALP.allowance(vaultInstance.address, apeswap.ApeswapRouter.address);
  if (!usdcDaiALPAllowance.gt("0")) {
    approvalTokens.push(usdcDaiALP.address);
    approvalSpender.push(apeswap.ApeswapRouter.address);
  }

  if (approvalTokens.length > 0) {
    console.log(`${approvalTokens.length} tokens to approve ...`, approvalTokens);
    console.log(`${approvalSpender.length} spender to spend ...`, approvalSpender);
    const governanceSigner = await ethers.getSigner(await registryInstance.getGovernance());
    if (getAddress(governanceSigner.address) === getAddress(deployer)) {
      const tx = await vaultInstance.connect(governanceSigner).giveAllowances(approvalTokens, approvalSpender, {
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
func.tags = ["PolygonopUSDC-Earn"];
func.dependencies = ["PolygonApproveTokensAndMapTokensHash"];
