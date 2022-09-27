import { ethers } from "hardhat";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import Curve from "@optyfi/defi-legos/ethereum/curve";
import Compound from "@optyfi/defi-legos/ethereum/compound";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import {
  ERC20,
  ERC20__factory,
  ICompound,
  ICompound__factory,
  ITokenMinter,
  ITokenMinter__factory,
  IUniswapV2Router02,
  Vault,
  Vault__factory,
} from "../../typechain";

const curveGuageABI = [
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claim_rewards",
    inputs: [],
    outputs: [],
  },
  {
    name: "claimable_tokens",
    outputs: [
      {
        type: "uint256",
        name: "",
      },
    ],
    inputs: [
      {
        type: "address",
        name: "addr",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "minter",
    outputs: [
      {
        type: "address",
        name: "",
      },
    ],
    inputs: [],
    stateMutability: "view",
    type: "function",
  },
];

const aaveIncentiveController = [
  {
    inputs: [
      { internalType: "address[]", name: "assets", type: "address[]" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
    ],
    name: "claimRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserUnclaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const comptrollerABI = [
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "holder", type: "address" },
      {
        internalType: "contract CToken[]",
        name: "cTokens",
        type: "address[]",
      },
    ],
    name: "claimComp",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "compAccrued",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const uniswapV2Router02Address = ethers.utils.getAddress("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  const sushiswapRouterAddress = ethers.utils.getAddress("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F");
  const CVX = ethers.utils.getAddress("0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
  const CRV = ethers.utils.getAddress("0xD533a949740bb3306d119CC777fa900bA034cd52");
  const USDC = ethers.utils.getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  const WETH = ethers.utils.getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  const LDO = ethers.utils.getAddress("0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32");
  // const STK_AAVE = ethers.utils.getAddress("0x4da27a545c0c5B758a6BA100e3a049001de870f5")
  const opUSDCSaveProxyAddress = ethers.utils.getAddress("0x6d8BfdB4c4975bB086fC9027e48D5775f609fF88");
  const opWETHSaveProxyAddress = ethers.utils.getAddress("0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8");
  const registryProxyAddress = ethers.utils.getAddress("0x99fa011E33A8c6196869DeC7Bc407E896BA67fE3");
  const opUSDCSavevaultInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, opUSDCSaveProxyAddress);
  const opWETHSavevaultInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, opWETHSaveProxyAddress);
  const aaveIncentiveControlleInstance = await ethers.getContractAt(
    aaveIncentiveController,
    "0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5",
  );
  const cUSDCInstanceopUSDCSave = <ICompound>await ethers.getContractAt(ICompound__factory.abi, Compound.cUSDC.address);

  const yearnGaugeInstance = await ethers.getContractAt(
    curveGuageABI,
    Curve.CurveDepositPool["usdc_dai+usdc+usdt_yearn"].gauge,
  );
  const stEthGaugeInstance = await ethers.getContractAt(curveGuageABI, Curve.CurveSwapPool["eth_eth+steth"].gauge);

  const unclaimedyearnCRVopUSDCSave = await yearnGaugeInstance.claimable_tokens(opUSDCSaveProxyAddress);
  const yearnCRVMinteropUSDCSave = await yearnGaugeInstance.minter();

  console.log("yearnCRVMinteropUSDCSave ", yearnCRVMinteropUSDCSave);

  const compoundComptrolleropUSDCSave = await cUSDCInstanceopUSDCSave.comptroller();
  const compoundComptrollerInstance = await ethers.getContractAt(comptrollerABI, compoundComptrolleropUSDCSave);

  const yearnCRVMinterInstanceopUSDCSave = <ITokenMinter>(
    await ethers.getContractAt(ITokenMinter__factory.abi, yearnCRVMinteropUSDCSave)
  );

  const uniswapRouterInstance = <IUniswapV2Router02>(
    await ethers.getContractAt("IUniswapV2Router02", uniswapV2Router02Address)
  );
  const sushiswapRouterInstance = <IUniswapV2Router02>(
    await ethers.getContractAt("IUniswapV2Router02", sushiswapRouterAddress)
  );
  const cvxInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, CVX);
  const crvInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, CRV);
  const ldoInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, LDO);

  console.log(
    "earned from yearn curve gauge opUSDCSave",
    formatEther(await yearnGaugeInstance.claimable_tokens(opUSDCSaveProxyAddress)),
  );
  console.log(
    "aave earned opUSDCSave ",
    formatEther(await aaveIncentiveControlleInstance.getUserUnclaimedRewards(opUSDCSaveProxyAddress)),
  );
  console.log(
    "comp earned opUSDCSave ",
    formatEther(await compoundComptrollerInstance.compAccrued(opUSDCSaveProxyAddress)),
  );

  const abi = [
    "function claimRewards(address[] calldata assets, uint256 amount, address to)",
    "function claimComp(address holder)",
    "function mint(address)",
    "function claim_rewards()",
    "function approve(address spender, uint256 amount)",
    "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline)",
    "function vaultDepositAllToStrategy()",
  ];
  const iface = new ethers.utils.Interface(abi);
  const codes = [];

  const cvxBalanceopUSDCSave = await cvxInstance.balanceOf(opUSDCSaveProxyAddress);
  const crvBalanceopUSDCSave = await crvInstance.balanceOf(opUSDCSaveProxyAddress);
  const unclaimedCompopUSDCSave = await compoundComptrollerInstance.compAccrued(opUSDCSaveProxyAddress);
  const unclaimedAaveopUSDCSave = await aaveIncentiveControlleInstance.getUserUnclaimedRewards(opUSDCSaveProxyAddress);

  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  // ================================================
  const stETHCRVMinteropWETHSave = await stEthGaugeInstance.minter();
  const ldoBalanceopWETHSave = await ldoInstance.balanceOf(opWETHSaveProxyAddress);
  console.log("ldoBalanceopWETHSave ", formatEther(ldoBalanceopWETHSave));
  const cvxBalanceopWETHSave = await cvxInstance.balanceOf(opWETHSaveProxyAddress);
  console.log("cvxBalanceopWETHSave ", formatEther(cvxBalanceopWETHSave));
  const crvBalanceopWETHSave = await crvInstance.balanceOf(opWETHSaveProxyAddress);
  console.log("crvBalanceopWETHSave ", formatEther(crvBalanceopWETHSave));
  const unclaimedCompopWETHSave = await compoundComptrollerInstance.compAccrued(opWETHSaveProxyAddress);
  console.log("unclaimedCompopWETHSave ", formatEther(unclaimedCompopWETHSave));
  const unclaimedAaveopWETHSave = await aaveIncentiveControlleInstance.getUserUnclaimedRewards(opWETHSaveProxyAddress);
  console.log("unclaimedAaveopWETHSave ", formatEther(unclaimedAaveopWETHSave));
  const unclaimedstethCRVopWETHSave = await stEthGaugeInstance.claimable_tokens(opWETHSaveProxyAddress);
  console.log("unclaimedstethCRVopWETHSave ", formatEther(unclaimedstethCRVopWETHSave));

  const [_s00ldo, ldoToWethExpectedSopWETHSave] = await sushiswapRouterInstance.getAmountsOut(ldoBalanceopWETHSave, [
    LDO,
    WETH,
  ]);
  const [_s00cvx, cvxToWethExpectedSopWETHSave] = await sushiswapRouterInstance.getAmountsOut(cvxBalanceopWETHSave, [
    CVX,
    WETH,
  ]);
  const [_s00crv, crvToWethExpectedSopWETHSave] = await sushiswapRouterInstance.getAmountsOut(
    crvBalanceopWETHSave.add(unclaimedstethCRVopWETHSave),
    [CRV, WETH],
  );
  const [_s00comp, compToWethExpectedSopWETHSave] = await sushiswapRouterInstance.getAmountsOut(
    unclaimedCompopWETHSave,
    [ethereumTokens.REWARD_TOKENS.COMP, WETH],
  );
  const [_s00aave, aaveToWethExpectedSopWETHSave] = await sushiswapRouterInstance.getAmountsOut(
    unclaimedAaveopWETHSave,
    [ethereumTokens.REWARD_TOKENS.AAVE, WETH],
  );

  console.log("ldoToWethExpectedSopWETHSave ", formatEther(ldoToWethExpectedSopWETHSave));
  console.log("cvxToWethExpectedSopWETHSave ", formatEther(cvxToWethExpectedSopWETHSave));
  console.log("crvToWethExpectedSopWETHSave ", formatEther(crvToWethExpectedSopWETHSave));
  console.log("compToWethExpectedSopWETHSave ", formatEther(compToWethExpectedSopWETHSave));
  console.log("aaveToWethExpectedSopWETHSave ", formatEther(aaveToWethExpectedSopWETHSave));

  const codesopWETHSave = [];

  // claim $CRV
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        stETHCRVMinteropWETHSave,
        iface.encodeFunctionData("mint(address)", [Curve.CurveSwapPool["eth_eth+steth"].gauge]),
      ],
    ),
  );
  // claim $COMP
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [compoundComptrollerInstance.address, iface.encodeFunctionData("claimComp(address)", [opWETHSaveProxyAddress])],
    ),
  );
  // claim $AAVE
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        aaveIncentiveControlleInstance.address,
        aaveIncentiveControlleInstance.interface.encodeFunctionData("claimRewards", [
          [],
          unclaimedstethCRVopWETHSave,
          opWETHSaveProxyAddress,
        ]),
      ],
    ),
  );

  // approve $LDO
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [LDO, iface.encodeFunctionData("approve", [sushiswapRouterAddress, ldoBalanceopWETHSave])],
    ),
  );
  // approve $CRV
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        CRV,
        iface.encodeFunctionData("approve", [
          sushiswapRouterAddress,
          crvBalanceopWETHSave.add(unclaimedstethCRVopWETHSave),
        ]),
      ],
    ),
  );
  // approve $CVX
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [CVX, iface.encodeFunctionData("approve", [sushiswapRouterAddress, cvxBalanceopWETHSave])],
    ),
  );
  // approve $COMP
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        ethereumTokens.REWARD_TOKENS.COMP,
        iface.encodeFunctionData("approve", [sushiswapRouterAddress, unclaimedCompopWETHSave]),
      ],
    ),
  );
  // // approve AAVE
  // codesopWETHSave.push(
  //     ethers.utils.defaultAbiCoder.encode(
  //         ["address", "bytes"],
  //         [ethereumTokens.REWARD_TOKENS.AAVE, iface.encodeFunctionData("approve", [sushiswapRouterAddress, unclaimedAaveopWETHSave])],
  //     ),
  // );

  // swap LDO on sushiswap
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          ldoBalanceopWETHSave,
          ldoToWethExpectedSopWETHSave.mul(9500).div(10000),
          [LDO, WETH],
          opWETHSaveProxyAddress,
          BigNumber.from(timestamp).add(1800),
        ]),
      ],
    ),
  );

  // swap CRV on sushiswap
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          crvBalanceopWETHSave.add(unclaimedstethCRVopWETHSave),
          crvToWethExpectedSopWETHSave.mul(9500).div(10000),
          [CRV, WETH],
          opWETHSaveProxyAddress,
          BigNumber.from(timestamp).add(1800),
        ]),
      ],
    ),
  );

  // swap CVX on sushiswap
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          cvxBalanceopWETHSave,
          cvxToWethExpectedSopWETHSave.mul(9500).div(10000),
          [CVX, WETH],
          opWETHSaveProxyAddress,
          BigNumber.from(timestamp).add(1800),
        ]),
      ],
    ),
  );

  // swap COMP on sushiswap
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          unclaimedCompopWETHSave,
          compToWethExpectedSopWETHSave.mul(9500).div(10000),
          [ethereumTokens.REWARD_TOKENS.COMP, WETH],
          opWETHSaveProxyAddress,
          BigNumber.from(timestamp).add(1800),
        ]),
      ],
    ),
  );

  // // swap AAVE on sushiswap
  // codesopWETHSave.push(
  //     ethers.utils.defaultAbiCoder.encode(
  //         ["address", "bytes"],
  //         [
  //             sushiswapRouterAddress,
  //             iface.encodeFunctionData("swapExactTokensForTokens", [
  //                 unclaimedAaveopWETHSave,
  //                 aaveToWethExpectedSopWETHSave.mul(9500).div(10000),
  //                 [ethereumTokens.REWARD_TOKENS.AAVE, WETH],
  //                 opWETHSaveProxyAddress,
  //                 BigNumber.from(timestamp).add(1800),
  //             ]),
  //         ],
  //     ),
  // );

  // vault deposit all to strategy
  codesopWETHSave.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [opWETHSaveProxyAddress, iface.encodeFunctionData("vaultDepositAllToStrategy", [])],
    ),
  );

  console.log(codesopWETHSave);

  // ================================================

  const [_s0crv, _s1crv, crvToUsdcExpectedSopUSDCSave] = await sushiswapRouterInstance.getAmountsOut(
    crvBalanceopUSDCSave.add(unclaimedyearnCRVopUSDCSave),
    [CRV, WETH, USDC],
  );
  const [_s0cvx, _s1cvx, cvxToUsdcExpectedSopUSDCSave] = await sushiswapRouterInstance.getAmountsOut(
    cvxBalanceopUSDCSave,
    [CVX, WETH, USDC],
  );
  const [_s0comp, _1compS, compToUsdcExpectedSopUSDCSave] = await sushiswapRouterInstance.getAmountsOut(
    unclaimedCompopUSDCSave,
    [ethereumTokens.REWARD_TOKENS.COMP, WETH, USDC],
  );

  const [_u0aave, _1aaveU, aaveToUsdcExpectedUopUSDCSave] = await uniswapRouterInstance.getAmountsOut(
    unclaimedAaveopUSDCSave,
    [ethereumTokens.REWARD_TOKENS.AAVE, WETH, USDC],
  );

  console.log("crvToUsdcExpectedSopUSDCSave ", formatUnits(crvToUsdcExpectedSopUSDCSave, 6));
  console.log("cvxToUsdcExpectedSopUSDCSave ", formatUnits(cvxToUsdcExpectedSopUSDCSave, 6));

  console.log("compToUsdcExpectedSopUSDCSave ", formatUnits(compToUsdcExpectedSopUSDCSave, 6));

  console.log("aaveToUsdcExpectedUopUSDCSave ", formatUnits(aaveToUsdcExpectedUopUSDCSave, 6));

  // claim $CRV
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        yearnCRVMinterInstanceopUSDCSave.address,
        iface.encodeFunctionData("mint(address)", [Curve.CurveDepositPool["usdc_dai+usdc+usdt_yearn"].gauge]),
      ],
    ),
  );

  // codes.push(
  //     ethers.utils.defaultAbiCoder.encode(
  //         ["address", "bytes"],
  //         [mimGaugeInstance.address, iface.encodeFunctionData("claim_rewards", [])],
  //     ),
  // );

  // claim $COMP
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [compoundComptrollerInstance.address, iface.encodeFunctionData("claimComp(address)", [opUSDCSaveProxyAddress])],
    ),
  );

  // claim $AAVE
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        aaveIncentiveControlleInstance.address,
        aaveIncentiveControlleInstance.interface.encodeFunctionData("claimRewards", [
          [],
          unclaimedAaveopUSDCSave,
          opUSDCSaveProxyAddress,
        ]),
      ],
    ),
  );
  // codes.push(
  //     ethers.utils.defaultAbiCoder.encode(
  //         ["address", "bytes"],
  //         [stkAAVEInstance.address, stkAAVEInstance.interface.encodeFunctionData("claimRewards",[opUSDCSaveProxyAddress,unclaimedAaveopUSDCSave])],
  //     ),
  // );

  // approve CVX to be spend by sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [CVX, iface.encodeFunctionData("approve", [sushiswapRouterAddress, cvxBalanceopUSDCSave])],
    ),
  );
  // approve CRV to be spend by sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        CRV,
        iface.encodeFunctionData("approve", [
          sushiswapRouterAddress,
          crvBalanceopUSDCSave.add(unclaimedyearnCRVopUSDCSave),
        ]),
      ],
    ),
  );

  // approve COMP to be spend by sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        ethereumTokens.REWARD_TOKENS.COMP,
        iface.encodeFunctionData("approve", [sushiswapRouterAddress, unclaimedCompopUSDCSave]),
      ],
    ),
  );

  // // approve AAVE to be spend by uniswap
  // codes.push(
  //     ethers.utils.defaultAbiCoder.encode(
  //         ["address", "bytes"],
  //         [ethereumTokens.REWARD_TOKENS.AAVE, iface.encodeFunctionData("approve", [uniswapV2Router02Address, unclaimedAaveopUSDCSave])],
  //     ),
  // );

  // swap CVX on sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          cvxBalanceopUSDCSave,
          cvxToUsdcExpectedSopUSDCSave.mul(9500).div(10000),
          [CVX, WETH, USDC],
          opUSDCSaveProxyAddress,
          BigNumber.from(timestamp).add(1800),
        ]),
      ],
    ),
  );
  // swap CRV on sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          crvBalanceopUSDCSave.add(unclaimedyearnCRVopUSDCSave),
          crvToUsdcExpectedSopUSDCSave.mul(9500).div(10000),
          [CRV, WETH, USDC],
          opUSDCSaveProxyAddress,
          BigNumber.from(timestamp).add(1800),
        ]),
      ],
    ),
  );

  // swap COMP on sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          unclaimedCompopUSDCSave,
          compToUsdcExpectedSopUSDCSave.mul(9500).div(10000),
          [ethereumTokens.REWARD_TOKENS.COMP, WETH, USDC],
          opUSDCSaveProxyAddress,
          BigNumber.from(timestamp).add(1800),
        ]),
      ],
    ),
  );

  // // swap AAVE on uniswap
  // codes.push(
  //     ethers.utils.defaultAbiCoder.encode(
  //         ["address", "bytes"],
  //         [
  //             uniswapV2Router02Address,
  //             iface.encodeFunctionData("swapExactTokensForTokens", [
  //                 unclaimedAaveopUSDCSave.div(2),
  //                 aaveToUsdcExpectedUopUSDCSave.mul(9500).div(10000),
  //                 [ethereumTokens.REWARD_TOKENS.AAVE, WETH, USDC],
  //                 opUSDCSaveProxyAddress,
  //                 BigNumber.from(timestamp).add(1800),
  //             ]),
  //         ],
  //     ),
  // );

  // vault deposit all to strategy
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [opUSDCSaveProxyAddress, iface.encodeFunctionData("vaultDepositAllToStrategy", [])],
    ),
  );

  console.log(codes);

  const transactions: MetaTransactionData[] = [
    {
      to: opUSDCSaveProxyAddress,
      value: "0",
      data: opUSDCSavevaultInstance.interface.encodeFunctionData("adminCall", [codes]),
    },
    {
      to: opWETHSaveProxyAddress,
      value: "0",
      data: opWETHSavevaultInstance.interface.encodeFunctionData("adminCall", [codesopWETHSave]),
    },
  ];
  const safeOwner = ethers.provider.getSigner(0);
  const safeAddress = "0xb95dff9A2D1d0003e74A64A1f36eE6767c8fb9Ed";
  const ethAdapter = <EthAdapter>new EthersAdapter({
    ethers,
    signer: safeOwner,
  });
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });
  const safeTransaction = await safeSdk.createTransaction(transactions);

  console.log("safeTransaction ", safeTransaction.data);
  const tx = await safeSdk.executeTransaction(safeTransaction);
  const txR = await tx.transactionResponse?.wait(1);
  console.log(txR);
}

main().then(console.log).catch(console.error);
