import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import { BigNumber } from "ethers";
import { oldAbis } from "../../../helpers/data/oldAbis";

export const ethereumTestVaults: {
  [key: string]: {
    [name: string]: {
      oldName: string;
      oldSymbol: string;
      oldAbi: any[];
      proxyAdmin: string;
      testAccount?: string;
      testBlockNumber?: BigNumber;
      hasStrategy: boolean;
      revision: BigNumber;
      newName: string;
      newSymbol: string;
    };
  };
} = {
  [`${ethereumTokens.PLAIN_TOKENS.USDC}`]: {
    "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88": {
      oldName: "op USD Coin Growth",
      oldSymbol: "opUSDCgrow",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xF980ea5758f71F418909688b6448B41ACb5522E9",
      testAccount: "0x0604c4190254aa6cb917b0b5f42ac158ee5eaac8",
      testBlockNumber: BigNumber.from("15612652"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi USDC Save Vault",
      newSymbol: "opUSDC-Save",
    },
    "0x114C81b0c846823F45B26e37A39F8E7DB866F324": {
      oldName: "op USD Coin Invest",
      oldSymbol: "opUSDCinvst",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      hasStrategy: false,
      revision: BigNumber.from("3"),
      newName: "OptyFi USDC Invest Vault",
      newSymbol: "opUSDC-Invst",
    },
  },
  [`${ethereumTokens.WRAPPED_TOKENS.WETH}`]: {
    "0xFf2fbd9Fbc6d03BAA77cf97A3D5671bEA183b9a8": {
      oldName: "op Wrapped Ether Growth",
      oldSymbol: "opWETHgrow",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xF980ea5758f71F418909688b6448B41ACb5522E9",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15546162"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi WETH Save Vault",
      newSymbol: "opWETH-Save",
    },
    "0x104D929F91227B8E4dA89CDee26e76d9c27bB347": {
      oldName: "op Wrapped Ether Invest",
      oldSymbol: "opWETHinvst",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      hasStrategy: false,
      revision: BigNumber.from("3"),
      newName: "OptyFi WETH Invest Vault",
      newSymbol: "opWETH-Invst",
    },
  },
  "0x98585dFc8d9e7D48F0b1aE47ce33332CF4237D96": {
    "0xF10aF2cf774B40bd4411fDF91d7C22003B46a130": {
      oldName: "op Newo Order Aggressive",
      oldSymbol: "opNEWOaggr",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xF980ea5758f71F418909688b6448B41ACb5522E9",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15591505"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi NEWO Invest Vault",
      newSymbol: "opNEWO-Invst",
    },
  },
  [`${ethereumTokens.REWARD_TOKENS.AAVE}`]: {
    "0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19": {
      oldName: "op Aave Token Aggressive",
      oldSymbol: "opAAVEaggr",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xF980ea5758f71F418909688b6448B41ACb5522E9",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15591521"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi AAVE Invest Vault",
      newSymbol: "opAAVE-Invst",
    },
  },
  "0x4d224452801ACEd8B2F0aebE155379bb5D594381": {
    "0x02303CbAc47bc9B7a1FF25d456C3A7F079a09ebc": {
      oldName: "op ApeCoin Aggressive",
      oldSymbol: "opAPEaggr",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      hasStrategy: false,
      revision: BigNumber.from("3"),
      newName: "OptyFi APE Invest Vault",
      newSymbol: "opAPE-Invst",
    },
  },
  "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942": {
    "0x15e98DD3e9aA220c559E4f020243736427420F25": {
      oldName: "op Decentraland MANA Aggressive",
      oldSymbol: "opMANAaggr",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      hasStrategy: false,
      revision: BigNumber.from("3"),
      newName: "OptyFi MANA Invest Vault",
      newSymbol: "opMANA-Invst",
    },
  },
  [`${ethereumTokens.REWARD_TOKENS.SUSHI}`]: {
    "0x4100488bfDA712538a078bC614f85534C127e780": {
      oldName: "op SushiToken Aggressive",
      oldSymbol: "opSUSHIaggr",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      hasStrategy: false,
      revision: BigNumber.from("3"),
      newName: "OptyFi SUSHI Invest Vault",
      newSymbol: "opSUSHI-Invst",
    },
  },
  [`${ethereumTokens.PLAIN_TOKENS.LINK}`]: {
    "0x3a13eaa0755FA168854E3BF3a9F2a40b42cAdEA3": {
      oldName: "op ChainLink Token Aggressive",
      oldSymbol: "opLINKaggr",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      hasStrategy: false,
      revision: BigNumber.from("3"),
      newName: "OptyFi LINK Invest Vault",
      newSymbol: "opLINK-Invst",
    },
  },
  [`${ethereumTokens.PLAIN_TOKENS.DAI}`]: {
    "0x71B48a3683D29Fd0a86AE19dDCDF4F52F5f2699e": {
      oldName: "op Dai Stablecoin Save",
      oldSymbol: "opDAIsave",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15590247"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi DAI Save Vault",
      newSymbol: "opDAI-Save",
    },
  },
  [`${ethereumTokens.PLAIN_TOKENS.USDT}`]: {
    "0xB63cfC06A509C71AE8a198b456eb9b63f4947A8B": {
      oldName: "op Tether USD Save",
      oldSymbol: "opUSDTsave",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15586859"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi USDT Save Vault",
      newSymbol: "opUSDT-Save",
    },
  },
  [`${ethereumTokens.BTC_TOKENS.WBTC}`]: {
    "0x41a909f773A42F7a99F69B9E847056a79caCa159": {
      oldName: "op Wrapped BTC Save",
      oldSymbol: "opWBTCsave",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15586951"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi WBTC Save Vault",
      newSymbol: "opWBTC-Save",
    },
    "0x9e002EaDaAE317B7ab2be3ddD6b2F67252f348a8": {
      oldName: "op Wrapped BTC Earn",
      oldSymbol: "opWBTCearn",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15590271"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi WBTC Earn Vault",
      newSymbol: "opWBTC-Earn",
    },
  },
  [`${ethereumTokens.WRAPPED_TOKENS.THREE_CRV}`]: {
    "0x9E8262534fAeF7cBB7E1AfDa483829246a0eB963": {
      oldName: "op Curve.fi DAI/USDC/USDT Earn",
      oldSymbol: "opUSD3earn",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4",
      testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
      testBlockNumber: BigNumber.from("15599035"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi USD3 Earn Vault",
      newSymbol: "opUSD3-Earn",
    },
  },
};

export const polygonTestVaults: {
  [key: string]: {
    [name: string]: {
      oldName: string;
      oldSymbol: string;
      oldAbi: any[];
      proxyAdmin: string;
      testAccount?: string;
      testBlockNumber?: BigNumber;
      hasStrategy: boolean;
      revision: BigNumber;
      newName: string;
      newSymbol: string;
    };
  };
} = {
  [`${polygonTokens.USDC}`]: {
    "0x7FeA9Dc468855B999389E396BdB1e3EbF6d19E83": {
      oldName: "op USDC Coin (PoS) Growth",
      oldSymbol: "opUSDCgrow",
      oldAbi: oldAbis.OldVaultV3,
      proxyAdmin: "0xF980ea5758f71F418909688b6448B41ACb5522E9",
      testAccount: "0xaed88729d6e9f7304eb3b9aa224a597162ded94d",
      testBlockNumber: BigNumber.from("33742647"),
      hasStrategy: true,
      revision: BigNumber.from("3"),
      newName: "OptyFi USDC Earn Vault",
      newSymbol: "opUSDC-Earn",
    },
  },
};
