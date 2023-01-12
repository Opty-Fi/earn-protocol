import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import { default as CurveExports } from "@optyfi/defi-legos/ethereum/curve/contracts";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";
import { ERC20, ERC20__factory, Registry__factory, Vault, Vault__factory } from "../typechain";

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
  const chainId = await getChainId();
  const artifact = await deployments.getArtifact("Vault");
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const commandBuilder = await deployments.get("CommandBuilder");
  const registryInstance = await hre.ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const usd3Approved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (usd3Approved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.hash)) {
    console.log("only set USD3 hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.address],
    ]);
  }
  if (!usd3Approved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.hash)) {
    console.log("approve USD3 and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.address],
    ]);
  }
  if (approveTokenAndMapHash.length > 0) {
    console.log("approveTokenAndMapHash ", JSON.stringify(approveTokenAndMapHash, null, 4));
    if (getAddress(deployer) === getAddress(operatorAddress)) {
      console.log("approve token and map hash");
      console.log("\n");
      const feeData = await ethers.provider.getFeeData();
      const approveTokenAndMapToTokensHashTx = await registryInstance
        .connect(operator)
        ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash, {
          type: 2,
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
        });
      await approveTokenAndMapToTokensHashTx.wait(1);
    } else {
      console.log("cannot approve token and map hash as signer is not the operator");
    }
  }

  if (onlySetTokensHash.length > 0) {
    console.log("onlySetTokensHash ", JSON.stringify(onlySetTokensHash, null, 4));
    if (getAddress(deployer) === getAddress(operatorAddress)) {
      console.log("operator mapping only tokenshash to tokens..");
      console.log("\n");
      const feeData = await ethers.provider.getFeeData();
      const onlyMapToTokensHashTx = await registryInstance
        .connect(operator)
        ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash, {
          type: 2,
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
        });
      await onlyMapToTokensHashTx.wait(1);
    } else {
      console.log("cannot map tokenshash to tokens as signer is not the operator");
    }
  }

  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const proxyArgs: { methodName: string; args: any[] } = {
    methodName: "initialize",
    args: [
      registryProxyAddress, //address _registry
      MULTI_CHAIN_VAULT_TOKENS[chainId].USD3.hash, //bytes32 _underlyingTokensHash
      "0x1f241a0f2460742481da49475eb1683fb84eb69cf3da43519a8b701f3309f783", //bytes32 _whitelistedAccountsRoot
      "USD3", //string memory _symbol
      "1", //uint256 _riskProfileCode
      "907136802102229675083754464877550363794833538656521846052285629999509143552", //uint256 _vaultConfiguration
      "115792089237316195423570985008687907853269984665640564039457584007913129639935", //uint256 _userDepositCapUT
      "0", //uint256 _minimumDepositValueUT
      "10000000000000000000000000", //uint256 _totalValueLockedLimitUT
    ],
  };
  const result = await deploy("opUSD3-Earn", {
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
      upgradeIndex: networkName == "hardhat" ? 0 : 3,
      proxyContract: "AdminUpgradeabilityProxy",
      implementationName: "opWETH-Save_Implementation",
      execute: {
        init: proxyArgs,
        onUpgrade: proxyArgs,
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  const vaultInstance = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSD3-Earn")).address)
  );
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opUSD3-Earn",
          address: vaultInstance.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opUSD3-Earn",
          address: vaultInstance.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }

  const approvalTokens: string[] = [];
  const approvalSpender: string[] = [];

  const threeCrvInstance = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, CurveExports.CurveSwapPool.usdc_3crv.lpToken)
  );
  const tokenInstanceUT = <ERC20>(
    await ethers.getContractAt(
      ERC20__factory.abi,
      CurveExports.CurveCryptoPool.pools["LUSD3CRV-f_bLUSDLUSD3-f"].tokens[0],
    )
  );
  const threeCrvCurveGaugeAllowance = await threeCrvInstance.allowance(
    vaultInstance.address,
    CurveExports.CurveSwapPool.usdc_3crv.gauge,
  );
  const allowanceUT = await tokenInstanceUT.allowance(
    vaultInstance.address,
    CurveExports.CurveCryptoPool.pools["LUSD3CRV-f_bLUSDLUSD3-f"].pool,
  );
  if (!allowanceUT.gt(parseEther("1000000"))) {
    approvalTokens.push(tokenInstanceUT.address);
    approvalSpender.push(CurveExports.CurveCryptoPool.pools["LUSD3CRV-f_bLUSDLUSD3-f"].pool);
  }
  const tokenInstanceLP = <ERC20>(
    await ethers.getContractAt(
      ERC20__factory.abi,
      CurveExports.CurveCryptoPool.pools["LUSD3CRV-f_bLUSDLUSD3-f"].lpToken,
    )
  );
  const allowanceLP = await tokenInstanceLP.allowance(
    vaultInstance.address,
    CurveExports.CurveCryptoPool.pools["LUSD3CRV-f_bLUSDLUSD3-f"].pool,
  );

  if (!threeCrvCurveGaugeAllowance.gt(parseEther("1000000"))) {
    approvalTokens.push(threeCrvInstance.address);
    approvalSpender.push(CurveExports.CurveSwapPool.usdc_3crv.gauge);
  }

  if (!allowanceLP.gt(parseEther("1000000"))) {
    approvalTokens.push(tokenInstanceLP.address);
    approvalSpender.push(CurveExports.CurveCryptoPool.pools["LUSD3CRV-f_bLUSDLUSD3-f"].pool);
  }

  const allowanceGauge = await tokenInstanceLP.allowance(
    vaultInstance.address,
    CurveExports.CurveCryptoPoolGauge.pools["bLUSDLUSD3-f"].pool,
  );
  if (!allowanceGauge.gt(parseEther("1000000"))) {
    approvalTokens.push(tokenInstanceLP.address);
    approvalSpender.push(CurveExports.CurveCryptoPoolGauge.pools["bLUSDLUSD3-f"].pool);
  }

  const usd3Instance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.WRAPPED_TOKENS.THREE_CRV);

  const usd3Allowance3Pool = await usd3Instance.allowance(
    vaultInstance.address,
    CurveExports.CurveSwapPool["dai+usdc+usdt_3crv"].pool,
  );

  if (!usd3Allowance3Pool.gt(parseEther("1000000"))) {
    approvalTokens.push(usd3Instance.address);
    approvalSpender.push(CurveExports.CurveSwapPool["dai+usdc+usdt_3crv"].pool);
  }

  const usdcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);

  const usdcAllowance3Pool = await usdcInstance.allowance(
    vaultInstance.address,
    CurveExports.CurveSwapPool["dai+usdc+usdt_3crv"].pool,
  );
  const usdcAllowanceExchange = await usdcInstance.allowance(
    vaultInstance.address,
    CurveExports.CurveRegistryExchange.address,
  );

  if (!usdcAllowance3Pool.gt(parseUnits("1000000", "6"))) {
    approvalTokens.push(usdcInstance.address);
    approvalSpender.push(CurveExports.CurveSwapPool["dai+usdc+usdt_3crv"].pool);
  }
  if (!usdcAllowanceExchange.gt(parseUnits("1000000", "6"))) {
    approvalTokens.push(usdcInstance.address);
    approvalSpender.push(CurveExports.CurveRegistryExchange.address);
  }

  const usdtInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDT);

  const usdtAllowance3Pool = await usdtInstance.allowance(
    vaultInstance.address,
    CurveExports.CurveSwapPool["dai+usdc+usdt_3crv"].pool,
  );
  const usdtAllowanceExchange = await usdtInstance.allowance(
    vaultInstance.address,
    CurveExports.CurveRegistryExchange.address,
  );

  if (!usdtAllowance3Pool.gt(parseUnits("1000000", "6"))) {
    approvalTokens.push(usdtInstance.address);
    approvalSpender.push(CurveExports.CurveSwapPool["dai+usdc+usdt_3crv"].pool);
  }
  if (!usdtAllowanceExchange.gt(parseUnits("1000000", "6"))) {
    approvalTokens.push(usdtInstance.address);
    approvalSpender.push(CurveExports.CurveRegistryExchange.address);
  }

  const fraxInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.FRAX);

  const fraxAllowanceExchange = await fraxInstance.allowance(
    vaultInstance.address,
    CurveExports.CurveRegistryExchange.address,
  );

  if (!fraxAllowanceExchange.gt(parseEther("1000000"))) {
    approvalTokens.push(fraxInstance.address);
    approvalSpender.push(CurveExports.CurveRegistryExchange.address);
  }

  if (approvalTokens.length > 0) {
    console.log(`${approvalTokens.length} tokens to approve ...`, approvalTokens);
    console.log(`${approvalSpender.length} spender to spend ...`, approvalSpender);
    const governanceSigner = await hre.ethers.getSigner(await registryInstance.getGovernance());
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
func.tags = ["opUSD3-Earn"];
func.dependencies = ["Registry"];
