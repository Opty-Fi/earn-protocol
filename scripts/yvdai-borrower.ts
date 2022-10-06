import { ethers } from "ethers";
import { formatEther } from "ethers/lib/utils";

const abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "part",
        type: "uint256",
      },
    ],
    name: "LogBorrow",
    type: "event",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userBorrowPart",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userCollateralShare",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "share",
        type: "uint256",
      },
    ],
    name: "LogAddCollateral",
    type: "event",
  },
];

async function main() {
  // const provider = new ethers.providers.JsonRpcProvider({ url: "https://nd-328-007-530.p2pify.com/", user: "zen-mcclintock", password: "sleek-bulk-chrome-statue-groggy-thread",timeout:1200000000 },1)
  // const provider = new ethers.providers.AlchemyProvider("mainnet", "k-rwPAw5_h5AKFyJ9Dx8zaHwMSpMhpbb");
  const provider = new ethers.providers.JsonRpcProvider(
    "https://nd-328-007-530.p2pify.com/17dfcd4517081ae1e066c2bd4d815e1a",
  );
  const instance = new ethers.Contract("0x7Ce7D9ED62B9A6c5aCe1c6Ec9aeb115FA3064757", abi, provider);
  const x = instance.filters.LogBorrow(null, null, null, null);
  const y = instance.filters.LogAddCollateral(null, null, null);
  const events = await instance.queryFilter(x, 14580480);
  const collateralShareevents = await instance.queryFilter(y, 14580480);
  let accounts = [];
  const collateralAccounts = [];
  for (const event of events) {
    accounts.push(event.args?.from);
  }
  for (const event of collateralShareevents) {
    collateralAccounts.push(event.args?.from);
  }
  accounts = [...new Set(accounts.concat(collateralAccounts))];
  const accountToBorrow: { [name: string]: { userBorrowPart: string; userCollateralShare: string } } = {};
  for (const account of accounts) {
    accountToBorrow[account] = { userBorrowPart: "0", userCollateralShare: "0" };
    accountToBorrow[account].userBorrowPart = formatEther(await instance.userBorrowPart(account));
    accountToBorrow[account].userCollateralShare = formatEther(await instance.userCollateralShare(account));
  }
  console.log(JSON.stringify(accountToBorrow, null, 4));
}

main().then(console.log).catch(console.error);
