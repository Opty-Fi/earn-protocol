import { writeFileSync } from "fs";
import { ethers } from "hardhat";

async function main() {
  const abi = [
    {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "poolInfo",
      outputs: [
        { internalType: "contract IERC20", name: "lpToken", type: "address" },
        { internalType: "uint256", name: "allocPoint", type: "uint256" },
        { internalType: "uint256", name: "lastRewardBlock", type: "uint256" },
        { internalType: "uint256", name: "accSushiPerShare", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "lpToken",
      outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  ];
  //masterchefv1 - 0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd
  const sushiswapMasterChefV1Instance = await ethers.getContractAt(abi, "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d");
  const obj: { [key: string]: number } = {};

  for (let i = 0; i < 59; i++) {
    const lp = await sushiswapMasterChefV1Instance.lpToken(i);
    obj[lp] = i;
  }
  writeFileSync("pids.json", JSON.stringify(obj));
}

main().then(console.log).catch(console.error);
