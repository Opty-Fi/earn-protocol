import fs from "fs";
import { join } from "path";
import { ethers } from "hardhat";
import ADDRESSES from "./allAddresses.json";

async function main() {
  const uniqueAddresses = [...new Set(ADDRESSES)];
  console.log("Number of Addresses :", uniqueAddresses.length);
  const CA: string[] = [];
  const inValidAddresses: string[] = [];
  const todoWhitelists: string[] = [];
  for (const address of uniqueAddresses as string[]) {
    if (!ethers.utils.isAddress(address)) {
      console.log("Invalid address :", address);
      inValidAddresses.push(address);
    } else {
      const code = await ethers.provider.getCode(address);
      if (code != "0x") {
        CA.push(address);
        console.log("A contract address : ", address);
      } else {
        todoWhitelists.push(address);
      }
    }
  }
  fs.writeFileSync(join(__dirname, "invalid-addresses.json"), JSON.stringify([...new Set(inValidAddresses)]));
  fs.writeFileSync(join(__dirname, "contract-addresses.json"), JSON.stringify([...new Set(CA)]));
  fs.writeFileSync(join(__dirname, "goodAddresses.json"), JSON.stringify([...new Set(todoWhitelists)]));
  return { CA, inValidAddresses };
}

main().then(console.log).catch(console.error);
