import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Signature } from "ethers";
import { getAddress, parseUnits, splitSignature } from "ethers/lib/utils";
import { task, types } from "hardhat/config";
import { ERC20Permit, ERC20Permit__factory } from "../../typechain";
import TASKS from "../task-names";

async function getPermitSignature(
  signer: SignerWithAddress,
  token: ERC20Permit,
  spender: string,
  value: BigNumber,
  deadline: BigNumber,
  permitConfig?: { nonce?: BigNumber; name?: string; chainId?: number; version?: string },
): Promise<Signature> {
  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? token.nonces(signer.address),
    permitConfig?.name ?? token.name(),
    permitConfig?.version ?? "1",
    permitConfig?.chainId ?? signer.getChainId(),
  ]);

  return splitSignature(
    await signer._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
      },
    ),
  );
}

task(TASKS.ACTION_TASKS.SIGN_EIP712_PERMIT.NAME, TASKS.ACTION_TASKS.SIGN_EIP712_PERMIT.DESCRIPTION)
  .addParam("token", "address of token", "", types.string)
  .addParam("owner", "address of token", "", types.string)
  .addParam("spender", "address of token", "", types.string)
  .addParam("amount", "amount of token to sign", "", types.string)
  .addParam("validity", "time in seconds until signature validation", "", types.string)
  .addParam("domainSeparatorVersion", "token domain separator version", "", types.string)
  .setAction(async ({ token, owner, spender, amount, validity, domainSeparatorVersion }, { ethers }) => {
    try {
      const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
      const tokenInstance = <ERC20Permit>await ethers.getContractAt(ERC20Permit__factory.abi, getAddress(token));
      const tokenDecimals = await tokenInstance.decimals();
      const tokenName = await tokenInstance.name();
      const tokenSymbol = await tokenInstance.symbol();
      const ownerSigner: SignerWithAddress = await ethers.getSigner(getAddress(owner));
      console.log("Token Name ", tokenName);
      console.log("Token Symbol ", tokenSymbol);
      console.log("Amount ", BigNumber.from(amount).toString());
      console.log("Owner ", ownerSigner.address);
      console.log("Spender ", getAddress(spender));
      console.log("Version ", BigNumber.from(domainSeparatorVersion).toString());
      console.log("Deadline ", BigNumber.from(currentTime).add(validity).toString());
      const { v, r, s } = await getPermitSignature(
        ownerSigner,
        tokenInstance,
        getAddress(spender),
        parseUnits(BigNumber.from(amount).toString(), tokenDecimals),
        BigNumber.from(currentTime).add(validity),
        {
          version: domainSeparatorVersion,
        },
      );
      console.log("V ", v);
      console.log("R ", r);
      console.log("S ", s);
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.SIGN_EIP712_PERMIT.NAME}: `, error);
      throw error;
    }
  });
