import { getAddress } from "ethers/lib/utils";
import fs from "fs";
import { ethers } from "hardhat";
import ADDRESSES from "./allAddresses.json";

async function main() {
  const checksummedAddresses = ADDRESSES.map(x => getAddress(x));
  const uniqueAddresses = [...new Set(checksummedAddresses)];
  console.log("Number of Addresses :", uniqueAddresses.length);
  const CA: string[] = [];
  const inValidAddresses: string[] = [];
  const todoWhitelists: string[] = [];
  for (const address of uniqueAddresses as string[]) {
    if (!ethers.utils.isAddress(address)) {
      console.log("Invalid address :", address);
      inValidAddresses.push(address);
    } else {
      const code = await ethers.provider.getCode(ethers.utils.getAddress(address));
      if (code != "0x") {
        CA.push(address);
        console.log("A contract address : ", address);
        console.log("Code : ", code);
      } else {
        todoWhitelists.push(address);
      }
    }
  }
  fs.writeFileSync("./invalid-addresses.json", JSON.stringify([...new Set(inValidAddresses)]));
  fs.writeFileSync("./contract-addresses.json", JSON.stringify([...new Set(CA)]));
  fs.writeFileSync("./goodAddresses.json", JSON.stringify([...new Set(todoWhitelists)]));
  return { CA, inValidAddresses };
}

main().then(console.log).catch(console.error);
