import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy as registryProxyAddress } from "../../_deployments/polygon.json";

export async function approveAndMapLiquidityPoolToAdapter(): Promise<void> {
  const { getAddress } = ethers.utils;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const curveStableSwapAdapterFac = await ethers.getContractFactory("CurveStableSwapAdapter");
  const curveStableSwapAdapter = await curveStableSwapAdapterFac.deploy(registryProxyAddress);

  const curveGaugeAdapterFac = await ethers.getContractFactory("CurveGaugeAdapter");
  const curveGaugeAdapter = await curveGaugeAdapterFac.deploy(registryProxyAddress);

  const beefyFinanceAdapterFac = await ethers.getContractFactory("BeefyFinanceAdapter");
  const beefyFinanceAdapter = await beefyFinanceAdapterFac.deploy(registryProxyAddress);

  const aaveAdapterFac = await ethers.getContractFactory("AaveAdapter");
  const aaveAdapter = await aaveAdapterFac.deploy(registryProxyAddress);

  const sushiswapPoolAdapterFac = await ethers.getContractFactory("SushiswapPoolAdapter");
  const sushiswapPoolAdapter = await sushiswapPoolAdapterFac.deploy(registryProxyAddress);

  const quickSwapPoolAdapterFac = await ethers.getContractFactory("QuickSwapPoolAdapter");
  const quickSwapPoolAdapter = await quickSwapPoolAdapterFac.deploy(registryProxyAddress);

  const apeSwapPoolAdapterFac = await ethers.getContractFactory("ApeSwapPoolAdapter");
  const apeSwapPoolAdapter = await apeSwapPoolAdapterFac.deploy(registryProxyAddress);

  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve liquidity pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0x3ac4e9aa29940770aeC38fe853a4bbabb2dA9C19": { rate: 90, adapter: aaveAdapter.address }, // aave lendingpoolregistryprovider
    "0x445FE580eF8d70FF569aB36e80c647af338db351": { rate: 80, adapter: curveStableSwapAdapter.address }, // curve Pool for am3CRV
    "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c": { rate: 80, adapter: curveGaugeAdapter.address }, // curve gauge for am3Crv
    "0xAA7C2879DaF8034722A0977f13c343aF0883E92e": { rate: 80, adapter: beefyFinanceAdapter.address }, // pool for mooCurveAm3CRV
    "0xB6B89a05ad8228b98d0D8a77e1a695c54500db3b": { rate: 80, adapter: beefyFinanceAdapter.address }, // pool for mooSushiUSDC-USDT
    "0x75424BE5378621AeC2eEF25965f40FeB59039B52": { rate: 80, adapter: beefyFinanceAdapter.address }, // pool for mooSushiUSDC-DAI
    "0x4462817b53E76b722c2D174D0148ddb81452f1dE": { rate: 80, adapter: beefyFinanceAdapter.address }, // pool for mooQuickUSDC-USDT
    "0x0dFd8c4dd493d8f87Be362878E41537Ca7Ee4d9e": { rate: 80, adapter: beefyFinanceAdapter.address }, // pool for mooquickUSDC-DAI
    "0xebe0c8d842AA5A57D7BEf8e524dEabA676F91cD1": { rate: 80, adapter: beefyFinanceAdapter.address }, // pool for mooMaiUSDC-miMATIC
    "0x8440DAe4E1002e83D57fbFD6d33E6F3684a35036": { rate: 80, adapter: beefyFinanceAdapter.address }, // pool for mooApeSwapUSDC-DAI
    "0x4b1f1e2435a9c96f7330faea190ef6a7c8d70001": { rate: 80, adapter: sushiswapPoolAdapter.address }, // pool for USDC-USDT-SLP
    "0xcd578f016888b57f1b1e3f887f392f0159e26747": { rate: 80, adapter: sushiswapPoolAdapter.address }, // pool for  USDC-DAI-SLP
    "0x2cF7252e74036d1Da831d11089D326296e64a728": { rate: 80, adapter: quickSwapPoolAdapter.address }, // pool for USDC-USDT-QLP
    "0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd": { rate: 80, adapter: quickSwapPoolAdapter.address }, // pool for USDC-DAI-QLP
    "0x160532D2536175d65C03B97b0630A9802c274daD": { rate: 80, adapter: quickSwapPoolAdapter.address }, // pool for USDC-MAI-QLP
    "0x5b13B583D4317aB15186Ed660A1E4C65C10da659": { rate: 80, adapter: apeSwapPoolAdapter.address }, // pool for USDC-DAI-ALP
  };

  const onlyMapPoolsToAdapters = [];
  const approveLiquidityPoolAndMap = [];
  const ratePools: [string, number][] = [];

  for (const pool of Object.keys(poolsWithRatings)) {
    const { rating, isLiquidityPool } = await registryV2Instance.getLiquidityPool(pool);
    const adapter = await registryV2Instance.liquidityPoolToAdapter(pool);
    if (!isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      approveLiquidityPoolAndMap.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      onlyMapPoolsToAdapters.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (rating != poolsWithRatings[pool].rate) {
      ratePools.push([pool, poolsWithRatings[pool].rate]);
    }
  }

  if (approveLiquidityPoolAndMap.length > 0) {
    // approve liquidity pool and map adapter
    const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveLiquidityPoolAndMapToAdapter((address,address)[])"](approveLiquidityPoolAndMap);
    await approveLiquidityPoolAndMapAdapterTx.wait();
  }

  if (onlyMapPoolsToAdapters.length > 0) {
    // only map pool to adapter
    const mapToAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["setLiquidityPoolToAdapter((address,address)[])"](onlyMapPoolsToAdapters);
    await mapToAdapterTx.wait();
  }

  if (ratePools.length > 0) {
    // rate pools
    const rateAdapterTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateLiquidityPool((address,uint8)[])"](ratePools);
    await rateAdapterTx.wait();
  }
}
