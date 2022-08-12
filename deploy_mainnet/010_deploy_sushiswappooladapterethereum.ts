import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import {
  Registry,
  Registry__factory,
  SushiswapPoolAdapterEthereum,
  SushiswapPoolAdapterEthereum__factory,
} from "../typechain";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";

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
  const artifact = await deployments.getArtifact("SushiswapPoolAdapterEthereum");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("SushiswapPoolAdapterEthereum", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, optyfiOracleAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const sushiswapPoolAdapterEthereum = await deployments.get("SushiswapPoolAdapterEthereum");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "SushiswapPoolAdapterEthereum",
          address: sushiswapPoolAdapterEthereum.address,
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapPoolAdapterEthereum",
          address: sushiswapPoolAdapterEthereum.address,
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      }
    }
  }
  const sushiswapPoolAdapterEthereumAddress = await (await deployments.get("SushiswapPoolAdapterEthereum")).address;
  const sushiswapPoolAdapterEthereumInstance = <SushiswapPoolAdapterEthereum>(
    await ethers.getContractAt(SushiswapPoolAdapterEthereum__factory.abi, sushiswapPoolAdapterEthereumAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const APE = "0x4d224452801ACEd8B2F0aebE155379bb5D594381";
  const ENS = "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72";
  const IMX = "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF";
  const YGG = "0x25f8087EAD173b73D6e8B84329989A8eEA16CF73";
  const ALCX = "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF";
  const CVX = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
  const MANA = "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942";
  const AAVE_WETH_LP = "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4";
  const APE_USDT_LP = "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f";
  const SUSHI_WETH_LP = "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0";
  const MANA_WETH_LP = "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97";
  const LINK_WETH_LP = "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967";
  const ENS_WETH_LP = "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D";
  const COMP_WETH_LP = "0x31503dcb60119A812feE820bb7042752019F2355";
  const IMX_WETH_LP = "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8";
  const LDO_WETH_LP = "0xC558F600B34A5f69dD2f0D06Cb8A88d829B7420a";
  const YGG_WETH_LP = "0x99B42F2B49C395D2a77D973f6009aBb5d67dA343";
  const ALCX_WETH_LP = "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8";
  const CRV_WETH_LP = "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009";
  const CVX_WETH_LP = "0x05767d9EF41dC40689678fFca0608878fb3dE906";
  const YFI_WETH_LP = "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C";

  const liquidityPoolToTolerances = [
    { liquidityPool: AAVE_WETH_LP, tolerance: "50" },
    { liquidityPool: APE_USDT_LP, tolerance: "50" },
    { liquidityPool: SUSHI_WETH_LP, tolerance: "100" },
    { liquidityPool: MANA_WETH_LP, tolerance: "150" },
    { liquidityPool: LINK_WETH_LP, tolerance: "50" },
    { liquidityPool: ENS_WETH_LP, tolerance: "200" },
    { liquidityPool: COMP_WETH_LP, tolerance: "70" },
    { liquidityPool: IMX_WETH_LP, tolerance: "100" },
    { liquidityPool: LDO_WETH_LP, tolerance: "100" },
    { liquidityPool: YGG_WETH_LP, tolerance: "100" },
    { liquidityPool: ALCX_WETH_LP, tolerance: "90" },
    { liquidityPool: CRV_WETH_LP, tolerance: "50" },
    { liquidityPool: CVX_WETH_LP, tolerance: "70" },
    { liquidityPool: YFI_WETH_LP, tolerance: "100" },
  ];
  const pendingLiquidityPoolToTolerances = [];
  for (const liquidityPoolToTolerance of liquidityPoolToTolerances) {
    const tolerance = await sushiswapPoolAdapterEthereumInstance.liquidityPoolToTolerance(
      liquidityPoolToTolerance.liquidityPool,
    );
    if (!BigNumber.from(tolerance).eq(BigNumber.from(liquidityPoolToTolerance.tolerance))) {
      pendingLiquidityPoolToTolerances.push(liquidityPoolToTolerance);
    }
  }

  if (pendingLiquidityPoolToTolerances.length > 0) {
    console.log("updating pending LiquidityPool To Tolerances");
    console.log(JSON.stringify(pendingLiquidityPoolToTolerances, null, 4));
    const tx = await sushiswapPoolAdapterEthereumInstance
      .connect(riskOperatorSigner)
      .setLiquidityPoolToTolerance(pendingLiquidityPoolToTolerances);
    await tx.wait(1);
  } else {
    console.log("liquidityPoolToTolerances are up to date");
  }

  const liquidityPoolToWantTokenToSlippages = [
    { liquidityPool: AAVE_WETH_LP, wantToken: ethereumTokens.REWARD_TOKENS.AAVE, slippage: "50" },
    { liquidityPool: AAVE_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "50" },
    { liquidityPool: APE_USDT_LP, wantToken: APE, slippage: "70" },
    { liquidityPool: APE_USDT_LP, wantToken: ethereumTokens.PLAIN_TOKENS.USDT, slippage: "50" },
    { liquidityPool: SUSHI_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "50" },
    { liquidityPool: SUSHI_WETH_LP, wantToken: ethereumTokens.REWARD_TOKENS.SUSHI, slippage: "150" },
    { liquidityPool: MANA_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "200" },
    { liquidityPool: MANA_WETH_LP, wantToken: MANA, slippage: "90" },
    { liquidityPool: LINK_WETH_LP, wantToken: ethereumTokens.PLAIN_TOKENS.LINK, slippage: "70" },
    { liquidityPool: LINK_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "50" },
    { liquidityPool: ENS_WETH_LP, wantToken: ENS, slippage: "200" },
    { liquidityPool: ENS_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "50" },
    { liquidityPool: COMP_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "50" },
    { liquidityPool: COMP_WETH_LP, wantToken: ethereumTokens.REWARD_TOKENS.COMP, slippage: "100" },
    { liquidityPool: IMX_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "150" },
    { liquidityPool: IMX_WETH_LP, wantToken: IMX, slippage: "50" },
    { liquidityPool: YGG_WETH_LP, wantToken: YGG, slippage: "100" },
    { liquidityPool: YGG_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "100" },
    { liquidityPool: ALCX_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "150" },
    { liquidityPool: ALCX_WETH_LP, wantToken: ALCX, slippage: "90" },
    { liquidityPool: CRV_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "50" },
    { liquidityPool: CRV_WETH_LP, wantToken: ethereumTokens.REWARD_TOKENS.CRV, slippage: "70" },
    { liquidityPool: CVX_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "150" },
    { liquidityPool: CVX_WETH_LP, wantToken: CVX, slippage: "90" },
    { liquidityPool: YFI_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "90" },
    { liquidityPool: YFI_WETH_LP, wantToken: ethereumTokens.REWARD_TOKENS.YFI, slippage: "90" },
  ];
  const pendingLiquidityPoolToWantTokenToSlippages = [];
  for (const liquidityPoolToWantTokenToSlippage of liquidityPoolToWantTokenToSlippages) {
    const slippage = await sushiswapPoolAdapterEthereumInstance.liquidityPoolToWantTokenToSlippage(
      liquidityPoolToWantTokenToSlippage.liquidityPool,
      liquidityPoolToWantTokenToSlippage.wantToken,
    );
    if (!BigNumber.from(slippage).eq(BigNumber.from(liquidityPoolToWantTokenToSlippage.slippage))) {
      pendingLiquidityPoolToWantTokenToSlippages.push(liquidityPoolToWantTokenToSlippage);
    }
  }

  if (pendingLiquidityPoolToWantTokenToSlippages.length > 0) {
    console.log("updating pending LiquidityPool To Want Token To Slippages ");
    const tx = await sushiswapPoolAdapterEthereumInstance
      .connect(riskOperatorSigner)
      .setLiquidityPoolToWantTokenToSlippage(pendingLiquidityPoolToWantTokenToSlippages);
    await tx.wait(1);
  } else {
    console.log("pendingLiquidityPoolToWantTokenToSlippages are up to date");
  }
};
export default func;
func.tags = ["SushiswapPoolAdapterEthereum"];
func.dependencies = ["Registry", "OptyFiOracle"];
