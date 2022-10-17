import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { task, types } from "hardhat/config";
import { ILimitOrder } from "../../typechain";

task("setAccountProof", "sets the account merkle proof for a given opVault in LimitOrder contract")
  .addParam("limitorder", "the address of the limitOrder", "", types.string)
  .addParam("vault", "the address of the opVault the account proof is for", "", types.string)
  .addParam(
    "proofstring",
    "a string representing the JSON object containing the opVault address and code proof of the code whitelist",
    "",
    types.string,
  )
  .setAction(async ({ limitorder, vault, proofstring }, hre) => {
    const ethers = hre.ethers;

    if (limitorder == "") {
      throw new Error("limit order diamond address required");
    }

    if (vault == "") {
      throw new Error("vault address required");
    }

    const proof = JSON.parse(proofstring);

    if (vault != proof.address) {
      throw new Error("opVault does not match account that proof is for");
    }

    const instance = await ethers.getContractAt("LimitOrder", ethers.utils.getAddress(limitorder));

    const owner: SignerWithAddress = await ethers.getSigner(await instance.owner());
    const settings: ILimitOrder = await ethers.getContractAt("ILimitOrder", ethers.utils.getAddress(limitorder));

    console.log(`Setting the account proof for ${vault}...`);

    try {
      const tx = await settings.connect(owner).setAccountProof(proof.proof, ethers.utils.getAddress(vault));

      await tx.wait();
    } catch (err) {
      console.log(`Failed to set the new account proof for ${vault} to ${proof.proof}!`);
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the account proof for ${vault}`);
  });
