import { deployments, ethers, getNamedAccounts } from "hardhat";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import Compound from "@optyfi/defi-legos/ethereum/compound";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import {
  ERC20,
  ERC20__factory,
  Registry,
  Registry__factory,
  StrategyProvider,
  StrategyProvider__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import { getRiskProfileCode } from "../../helpers/utils";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const compoundLensABI = [
  {
    constant: true,
    inputs: [
      {
        internalType: "contract Comp",
        name: "comp",
        type: "address",
      },
      {
        internalType: "contract ComptrollerLensInterface",
        name: "comptroller",
        type: "address",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "getCompBalanceMetadataExt",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "balance",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "votes",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "delegate",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "allocated",
            type: "uint256",
          },
        ],
        internalType: "struct CompoundLens.CompBalanceMetadataExt",
        name: "",
        type: "tuple",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

const comptrollerABI = [
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "compAccrued",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "holders",
        type: "address[]",
      },
      {
        internalType: "contract CToken[]",
        name: "cTokens",
        type: "address[]",
      },
      {
        internalType: "bool",
        name: "borrowers",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "suppliers",
        type: "bool",
      },
    ],
    name: "claimComp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const cryptoPoolGaugeABI = [
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claim_rewards",
    inputs: [
      {
        name: "_addr",
        type: "address",
      },
    ],
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "claimable_reward",
    inputs: [
      {
        name: "_user",
        type: "address",
      },
      {
        name: "_reward_token",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
];

const compoundLensAddress = "0xd513d22422a3062bd342ae374b4b9c20e0a9a074";
const compoundComptrollerAddress = "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B";
const uniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const sushiswapRouterAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
const bLUSDLUSD3FactoryGaugeAddress = "0xdA0DD1798BE66E17d5aB1Dc476302b56689C2DB4";
const cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
const ldoAddress = "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32";

ethereumTokens.PLAIN_TOKENS.LUSD;

async function main() {
  // registry
  const registry = <Registry>(
    await ethers.getContractAt(Registry__factory.abi, (await deployments.get("RegistryProxy")).address)
  );

  // vault instances
  const opUSDCEarn = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSDC-Earn_Proxy")).address)
  );
  // const opWETHEarn = <Vault>(
  //     await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWETH-Earn_Proxy")).address)
  // );
  const opDAISave = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opDAI-Save_Proxy")).address)
  );
  const opUSDTSave = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSDT-Save_Proxy")).address)
  );
  const opWBTCSave = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWBTC-Save_Proxy")).address)
  );
  const opUSD3Earn = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSD3-Earn_Proxy")).address)
  );
  const opWETHSave = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWETH-Save_Proxy")).address)
  );
  const opWBTCEarn = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWBTC-Earn_Proxy")).address)
  );
  const opUSDCInvst = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSDC-Invst_Proxy")).address)
  );
  const opWETHInvst = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWETH-Invst_Proxy")).address)
  );

  // strategy provider
  const strategyProvider = <StrategyProvider>(
    await ethers.getContractAt(StrategyProvider__factory.abi, (await deployments.get("StrategyProvider")).address)
  );

  // gnosis safe
  const safeOwnerAddress = (await getNamedAccounts()).deployer;
  const safeOwner = ethers.provider.getSigner(safeOwnerAddress);
  const ethAdapter = <EthAdapter>new EthersAdapter({
    ethers,
    signer: safeOwner,
  });
  const safeAddress = await registry.strategyOperator();
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });

  // compound
  const comp = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.REWARD_TOKENS.COMP);
  const compoundComptrollerInstance = await ethers.getContractAt(comptrollerABI, compoundComptrollerAddress);
  const compoundLens = await ethers.getContractAt(compoundLensABI, compoundLensAddress);

  const compBalanceInopUSDCEarn = await comp.balanceOf(opUSD3Earn.address);
  const { allocated: unclaimedCompopUSDCEarn } = await compoundLens.getCompBalanceMetadataExt(
    ethereumTokens.REWARD_TOKENS.COMP,
    compoundComptrollerInstance.address,
    opUSDCEarn.address,
  );
  const totalCompInopUSDCEarn = compBalanceInopUSDCEarn.add(unclaimedCompopUSDCEarn);

  const compBalanceInopDAISave = await comp.balanceOf(opDAISave.address);
  const { allocated: unclaimedCompopDAISave } = await compoundLens.getCompBalanceMetadataExt(
    ethereumTokens.REWARD_TOKENS.COMP,
    compoundComptrollerInstance.address,
    opDAISave.address,
  );
  const totalCompInopDAISave = compBalanceInopDAISave.add(unclaimedCompopDAISave);

  const compBalanceInopUSDTSave = await comp.balanceOf(opUSDTSave.address);
  const { allocated: unclaimedCompopUSDTSave } = await compoundLens.getCompBalanceMetadataExt(
    ethereumTokens.REWARD_TOKENS.COMP,
    compoundComptrollerInstance.address,
    opUSDTSave.address,
  );
  const totalCompInopUSDTSave = compBalanceInopUSDTSave.add(unclaimedCompopUSDTSave);

  // LUSD
  const bLUSDLUSD3FactoryGauge = await ethers.getContractAt(cryptoPoolGaugeABI, bLUSDLUSD3FactoryGaugeAddress);
  const lusd = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.PLAIN_TOKENS.LUSD);
  const lusdBalanceInopUSD3Earn = await lusd.balanceOf(opUSD3Earn.address);
  const unclaimedLUSDInopUSD3Earn = await bLUSDLUSD3FactoryGauge.claimable_reward(opUSD3Earn.address, lusd.address);
  const totalLusdInopUSD3Earn = lusdBalanceInopUSD3Earn.add(unclaimedLUSDInopUSD3Earn);

  // CRV
  const crv = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.REWARD_TOKENS.CRV);
  const crvBalanceInopUSD3Earn = await crv.balanceOf(opUSD3Earn.address);
  const crvBalanceInopWETHSave = await crv.balanceOf(opWETHSave.address);
  const crvBalanceInopWBTCEarn = await crv.balanceOf(opWBTCEarn.address);

  // CVX
  const cvx = <ERC20>await ethers.getContractAt(ERC20__factory.abi, cvxAddress);
  const cvxBalanceInopUSD3Earn = await cvx.balanceOf(opUSD3Earn.address);
  const cvxBalanceInopWETHSave = await cvx.balanceOf(opWETHSave.address);
  const cvxBalanceInopWBTCEarn = await cvx.balanceOf(opWBTCEarn.address);

  // LDO
  const ldo = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ldoAddress);
  const ldoBalanceInopWETHSave = await ldo.balanceOf(opWETHSave.address);

  // SUSHI
  const sushi = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.REWARD_TOKENS.SUSHI);
  const sushiBalanceInopUSDCInvst = await sushi.balanceOf(opUSDCInvst.address);
  const sushiBalanceInopWETHInvst = await sushi.balanceOf(opWETHInvst.address);

  // time
  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  // exchange rate
  const oneCOMPToDAI = parseEther("52.17");
  const oneCOMPToUSDT = parseUnits("52.18", "6");
  const oneCOMPToUSDC = parseUnits("52.19", "6");
  const oneLUSDTo3CRV = parseEther("1");
  const oneCRVTo3CRV = parseEther("0.92");
  const oneCVXTo3CRV = parseEther("5.58");
  const oneCRVToWETH = parseEther("0.0006");
  const oneCVXToWETH = parseEther("0.003");
  const oneLDOToWETH = parseEther("0.001");
  const oneCRVToWBTC = parseUnits("0.00005", "8");
  const oneCVXToWBTC = parseUnits("0.00028", "8");
  const oneSUSHIToUSDC = parseUnits("1.69", "6");
  const oneSUSHIToWETH = parseEther("0.001");

  const transactions: MetaTransactionData[] = [];

  //claim COMP
  transactions.push({
    to: compoundComptrollerInstance.address,
    value: "0",
    data: compoundComptrollerInstance.interface.encodeFunctionData("claimComp", [
      [opDAISave.address, opUSDCEarn.address, opUSDTSave.address],
      [Compound.cDAI.address, Compound.cUSDC.address, "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9"],
      false,
      true,
    ]),
  });

  // opDAISave
  // null strategy for opDAISave
  transactions.push({
    to: strategyProvider.address,
    value: "0",
    data: strategyProvider.interface.encodeFunctionData("setBestStrategy", [
      getRiskProfileCode(await opDAISave.vaultConfiguration()),
      await opDAISave.underlyingTokensHash(),
      [],
    ]),
  });
  // harvest for opDAISave
  const uniV3SwapPathForCOMPtoDAI = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [
      ethereumTokens.REWARD_TOKENS.COMP,
      10000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      500,
      ethereumTokens.PLAIN_TOKENS.DAI,
    ],
  );
  const expectedDAIForopDAISaveFromCOMP = totalCompInopDAISave.mul(oneCOMPToDAI).div(parseEther("1"));
  transactions.push({
    to: opDAISave.address,
    value: "0",
    data: opDAISave.interface.encodeFunctionData("harvest", [
      ethereumTokens.REWARD_TOKENS.COMP,
      uniswapV3RouterAddress,
      true,
      expectedDAIForopDAISaveFromCOMP.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCOMPtoDAI,
    ]),
  });
  // rebalance opDAISave
  transactions.push({
    to: opDAISave.address,
    value: "0",
    data: opDAISave.interface.encodeFunctionData("rebalance"),
  });

  // opUSDTSave
  // null strategy for opUSDTSave
  transactions.push({
    to: strategyProvider.address,
    value: "0",
    data: strategyProvider.interface.encodeFunctionData("setBestStrategy", [
      getRiskProfileCode(await opUSDTSave.vaultConfiguration()),
      await opUSDTSave.underlyingTokensHash(),
      [],
    ]),
  });

  // harvest for opUSDTSave
  const uniV3SwapPathForCOMPtoUSDT = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [
      ethereumTokens.REWARD_TOKENS.COMP,
      10000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      500,
      ethereumTokens.PLAIN_TOKENS.USDT,
    ],
  );
  const expectedUSDTForopUSDTSaveFromCOMP = totalCompInopUSDTSave.mul(oneCOMPToUSDT).div(parseEther("1"));
  transactions.push({
    to: opUSDTSave.address,
    value: "0",
    data: opUSDTSave.interface.encodeFunctionData("harvest", [
      ethereumTokens.REWARD_TOKENS.COMP,
      uniswapV3RouterAddress,
      true,
      expectedUSDTForopUSDTSaveFromCOMP.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCOMPtoUSDT,
    ]),
  });

  // rebalance opUSDTSave
  transactions.push({
    to: opUSDTSave.address,
    value: "0",
    data: opUSDTSave.interface.encodeFunctionData("rebalance"),
  });

  // opWBTCSave
  // null strategy for opWBTCSave
  transactions.push({
    to: strategyProvider.address,
    value: "0",
    data: strategyProvider.interface.encodeFunctionData("setBestStrategy", [
      getRiskProfileCode(await opWBTCSave.vaultConfiguration()),
      await opWBTCSave.underlyingTokensHash(),
      [],
    ]),
  });
  // rebalance opWBTCSave
  transactions.push({
    to: opWBTCSave.address,
    value: "0",
    data: opWBTCSave.interface.encodeFunctionData("rebalance"),
  });

  // opWETHSave
  // null strategy for opWETHSave
  transactions.push({
    to: strategyProvider.address,
    value: "0",
    data: strategyProvider.interface.encodeFunctionData("setBestStrategy", [
      getRiskProfileCode(await opWETHSave.vaultConfiguration()),
      await opWETHSave.underlyingTokensHash(),
      [],
    ]),
  });
  // harvest CRV for opWETHSave
  const uniV3SwapPathForCRVtoWETH = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [ethereumTokens.REWARD_TOKENS.CRV, 3000, ethereumTokens.WRAPPED_TOKENS.WETH],
  );
  const expectedWETHForopWETHSaveFromCRV = crvBalanceInopWETHSave.mul(oneCRVToWETH).div(parseEther("1"));
  transactions.push({
    to: opWETHSave.address,
    value: "0",
    data: opWETHSave.interface.encodeFunctionData("harvest", [
      ethereumTokens.REWARD_TOKENS.CRV,
      uniswapV3RouterAddress,
      true,
      expectedWETHForopWETHSaveFromCRV.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCRVtoWETH,
    ]),
  });
  // harvest CVX for opWETHSave
  const uniV3SwapPathForCVXtoWETH = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [cvx.address, 10000, ethereumTokens.WRAPPED_TOKENS.WETH],
  );
  const expectedWETHForopWETHSaveFromCVX = cvxBalanceInopWETHSave.mul(oneCVXToWETH).div(parseEther("1"));
  transactions.push({
    to: opWETHSave.address,
    value: "0",
    data: opWETHSave.interface.encodeFunctionData("harvest", [
      cvxAddress,
      uniswapV3RouterAddress,
      true,
      expectedWETHForopWETHSaveFromCVX.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCVXtoWETH,
    ]),
  });
  // harvest LDO for opWETHSave
  const uniV3SwapPathForLDOtoWETH = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [ldo.address, 3000, ethereumTokens.WRAPPED_TOKENS.WETH],
  );
  const expectedWETHForopWETHSaveFromLDO = ldoBalanceInopWETHSave.mul(oneLDOToWETH).div(parseEther("1"));
  transactions.push({
    to: opWETHSave.address,
    value: "0",
    data: opWETHSave.interface.encodeFunctionData("harvest", [
      ldoAddress,
      uniswapV3RouterAddress,
      true,
      expectedWETHForopWETHSaveFromLDO.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForLDOtoWETH,
    ]),
  });
  // rebalance opWETHSave
  transactions.push({
    to: opWETHSave.address,
    value: "0",
    data: opWETHSave.interface.encodeFunctionData("rebalance"),
  });

  // opUSDCEarn
  // harvest for opUSDCEarn
  const uniV3SwapPathForCOMPtoUSDC = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [
      ethereumTokens.REWARD_TOKENS.COMP,
      10000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      500,
      ethereumTokens.PLAIN_TOKENS.USDC,
    ],
  );
  const expectedUSDCForopUSDCEarnFromCOMP = totalCompInopUSDCEarn.mul(oneCOMPToUSDC).div(parseEther("1"));
  transactions.push({
    to: opUSDCEarn.address,
    value: "0",
    data: opUSDCEarn.interface.encodeFunctionData("harvest", [
      ethereumTokens.REWARD_TOKENS.COMP,
      uniswapV3RouterAddress,
      true,
      expectedUSDCForopUSDCEarnFromCOMP.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCOMPtoUSDC,
    ]),
  });

  // vaultDepositAllToStrategy for opUSDCEarn
  transactions.push({
    to: opUSDCEarn.address,
    value: "0",
    data: opUSDCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
  });

  // opUSD3Earn
  // claim for opUSD3Earn
  transactions.push({
    to: bLUSDLUSD3FactoryGauge.address,
    value: "0",
    data: bLUSDLUSD3FactoryGauge.interface.encodeFunctionData("claim_rewards", [opUSD3Earn.address]),
  });

  // harvest for LUSD opUSD3Earn
  const uniV3SwapPathForLUSDto3CRV = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
    [
      lusd.address,
      10000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      3000,
      ethereumTokens.PLAIN_TOKENS.USDC,
      3000,
      ethereumTokens.WRAPPED_TOKENS.THREE_CRV,
    ],
  );
  const expected3CRVForopUSD3EarnFromLUSD = totalLusdInopUSD3Earn.mul(oneLUSDTo3CRV).div(parseEther("1"));
  transactions.push({
    to: opUSD3Earn.address,
    value: "0",
    data: opUSD3Earn.interface.encodeFunctionData("harvest", [
      lusd.address,
      uniswapV3RouterAddress,
      true,
      expected3CRVForopUSD3EarnFromLUSD.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForLUSDto3CRV,
    ]),
  });

  // harvest for CRV opUSD3Earn
  const uniV3SwapPathForCRVto3CRV = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
    [
      ethereumTokens.REWARD_TOKENS.CRV,
      3000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      3000,
      ethereumTokens.PLAIN_TOKENS.USDC,
      3000,
      ethereumTokens.WRAPPED_TOKENS.THREE_CRV,
    ],
  );
  const expected3CRVForopUSD3EarnFromCRV = crvBalanceInopUSD3Earn.mul(oneCRVTo3CRV).div(parseEther("1"));
  transactions.push({
    to: opUSD3Earn.address,
    value: "0",
    data: opUSD3Earn.interface.encodeFunctionData("harvest", [
      ethereumTokens.REWARD_TOKENS.CRV,
      uniswapV3RouterAddress,
      true,
      expected3CRVForopUSD3EarnFromCRV.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCRVto3CRV,
    ]),
  });
  // harvest for CVX opUSD3Earn
  const uniV3SwapPathForCVXto3CRV = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
    [
      cvx.address,
      10000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      3000,
      ethereumTokens.PLAIN_TOKENS.USDC,
      3000,
      ethereumTokens.WRAPPED_TOKENS.THREE_CRV,
    ],
  );
  const expected3CRVForopUSD3EarnFromCVX = cvxBalanceInopUSD3Earn.mul(oneCVXTo3CRV).div(parseEther("1"));
  transactions.push({
    to: opUSD3Earn.address,
    value: "0",
    data: opUSD3Earn.interface.encodeFunctionData("harvest", [
      cvx.address,
      uniswapV3RouterAddress,
      true,
      expected3CRVForopUSD3EarnFromCVX.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCVXto3CRV,
    ]),
  });
  // vaultDepositAllToStrategy for opUSD3Earn
  transactions.push({
    to: opUSD3Earn.address,
    value: "0",
    data: opUSD3Earn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
  });

  //   opWBTCEarn (did not worked)
  // harvest crv for opWBTCEarn
  const uniV3SwapPathForCRVtoWBTC = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [crv.address, 3000, ethereumTokens.PLAIN_TOKENS.USDC, 3000, ethereumTokens.BTC_TOKENS.WBTC],
  );
  const expectedWBTCForopWBTCEarnFromCRV = crvBalanceInopWBTCEarn.mul(oneCRVToWBTC).div(parseEther("1"));
  transactions.push({
    to: opWBTCEarn.address,
    value: "0",
    data: opWBTCEarn.interface.encodeFunctionData("harvest", [
      crv.address,
      uniswapV3RouterAddress,
      true,
      expectedWBTCForopWBTCEarnFromCRV.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCRVtoWBTC,
    ]),
  });
  // harvest cvx for opWBTCEarn
  const uniV3SwapPathForCVXtoWBTC = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [cvx.address, 10000, ethereumTokens.WRAPPED_TOKENS.WETH, 500, ethereumTokens.BTC_TOKENS.WBTC],
  );
  const expectedWBTCForopWBTCEarnFromCVX = cvxBalanceInopWBTCEarn.mul(oneCVXToWBTC).div(parseEther("1"));
  transactions.push({
    to: opWBTCEarn.address,
    value: "0",
    data: opWBTCEarn.interface.encodeFunctionData("harvest", [
      cvx.address,
      uniswapV3RouterAddress,
      true,
      expectedWBTCForopWBTCEarnFromCVX.mul("9900").div("10000"),
      BigNumber.from(timestamp).add("600"),
      [],
      uniV3SwapPathForCVXtoWBTC,
    ]),
  });
  // vaultDepositAllToStrategy for opWBTCEarn
  transactions.push({
    to: opWBTCEarn.address,
    value: "0",
    data: opWBTCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
  });

  // opUSDCInvst (did not worked)
  // harvest SUSHI for opUSDCInvst
  const expectedUSDCInopUSDCInvstFromSUSHI = sushiBalanceInopUSDCInvst.mul(oneSUSHIToUSDC).div(parseEther("1"));
  transactions.push({
    to: opUSDCInvst.address,
    value: "0",
    data: opUSDCInvst.interface.encodeFunctionData("harvest", [
      sushi.address,
      sushiswapRouterAddress,
      false,
      expectedUSDCInopUSDCInvstFromSUSHI.mul(9900).div("10000"),
      BigNumber.from(timestamp).add("600"),
      [
        sushi.address,
        ethereumTokens.WRAPPED_TOKENS.WETH,
        ethereumTokens.PLAIN_TOKENS.DAI,
        ethereumTokens.PLAIN_TOKENS.USDC,
      ],
      "0x",
    ]),
  });
  // vaultDepositAllToStrategy for opUSDCInvst
  transactions.push({
    to: opUSDCInvst.address,
    value: "0",
    data: opUSDCInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
  });

  // opWETHInvst
  // harvest SUSHI for opWETHInvst
  const expectedWETHInopWETHInvstFromSUSHI = sushiBalanceInopWETHInvst.mul(oneSUSHIToWETH).div(parseEther("1"));
  transactions.push({
    to: opWETHInvst.address,
    value: "0",
    data: opWETHInvst.interface.encodeFunctionData("harvest", [
      sushi.address,
      sushiswapRouterAddress,
      false,
      expectedWETHInopWETHInvstFromSUSHI.mul(9900).div("10000"),
      BigNumber.from(timestamp).add("600"),
      [
        sushi.address,
        ethereumTokens.PLAIN_TOKENS.DAI,
        "0x87d73E916D7057945c9BcD8cdd94e42A6F47f776",
        ethereumTokens.WRAPPED_TOKENS.WETH,
      ],
      "0x",
    ]),
  });
  // vaultDepositAllToStrategy for opWETHInvst
  transactions.push({
    to: opWETHInvst.address,
    value: "0",
    data: opWETHInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
  });

  // gnosis safe
  const safeTransaction = await safeSdk.createTransaction(transactions);
  console.log("safeTransaction ", safeTransaction.data);
  const tx = await safeSdk.executeTransaction(safeTransaction);
  const txR = await tx.transactionResponse?.wait(1);
  console.log(txR);
}

main().then(console.log).catch(console.error);
