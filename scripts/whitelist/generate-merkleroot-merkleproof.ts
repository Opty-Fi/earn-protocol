import fs from "fs";
import { getAccountsMerkleProof, getAccountsMerkleRoot } from "../../helpers/utils";
import goodAddresses from "./goodAddresses.json";

async function main() {
  const accountsRoot = getAccountsMerkleRoot(goodAddresses as string[]);

  const merkleProofList = [];

  for (const account of goodAddresses) {
    const proofs = getAccountsMerkleProof(goodAddresses as string[], account);
    merkleProofList.push({
      account,
      proofs,
    });
  }

  fs.writeFileSync("merkleproofs.json", JSON.stringify(merkleProofList));

  return accountsRoot;
}
main().then(console.log).catch(console.error);
