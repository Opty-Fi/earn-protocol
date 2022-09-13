import abi from "ethereumjs-abi";
const tokens = [
  ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
  ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"],
  ["0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"],
];

type STRATEGY_DATA = {
  contract: string;
  outputTokenSymbol?: string;
  outputToken: string;
  isBorrow: boolean;
  adapterName?: string;
  protocol?: string;
};

function getSoliditySHA3Hash(argTypes: string[], args: any[]): string {
  const soliditySHA3Hash = "0x" + abi.soliditySHA3(argTypes, args).toString("hex");
  return soliditySHA3Hash;
}

function generateTokenHashV2(addresses: string[], chainId: string): string {
  return getSoliditySHA3Hash(["address[]", "string"], [addresses, chainId]);
}

async function hashes(): Promise<void> {
  console.log(generateTokenHashV2(["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], "0x1"));
  console.log(generateTokenHashV2(["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"], "0x1"));
  console.log(generateTokenHashV2(["0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"], "0x1"));
}

function generateStrategyHashV2(strategy: STRATEGY_DATA[], tokensHash: string): string {
  const strategyStepsHash: string[] = [];
  for (let index = 0; index < strategy.length; index++) {
    strategyStepsHash[index] = getSoliditySHA3Hash(
      ["address", "address", "bool"],
      [strategy[index].contract, strategy[index].outputToken, strategy[index].isBorrow],
    );
  }
  return getSoliditySHA3Hash(["bytes32", "bytes32[]"], [tokensHash, strategyStepsHash]);
}

console.log(
  generateStrategyHashV2(
    [
      {
        contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
        outputTokenSymbol: "3Crv",
        outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        isBorrow: false,
        adapterName: "CurveSwapPool",
        protocol: "Curve",
      },
      {
        contract: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
        outputTokenSymbol: "cvx3Crv",
        outputToken: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
        isBorrow: false,
        adapterName: "Convex",
        protocol: "Convex",
      },
    ],
    "0x9090b8d48a864f6fd5afa4fe28e1b20db57c0af46cf9e294b8fe36bf57fc1f01",
  ),
);

hashes();
