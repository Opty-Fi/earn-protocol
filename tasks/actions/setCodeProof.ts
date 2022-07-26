import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { task, types } from 'hardhat/config';
//@ts-ignore
import { ILimitOrder } from '../../typechain-types';

task(
  'setCodeProof',
  'sets the code merkle proof for a given opVault in LimitOrderDiamond contract',
)
  .addParam(
    'limitorderdiamond',
    'the address of the limitOrderDiamond',
    '',
    types.string,
  )
  .addParam(
    'vault',
    'the address of the opVault the account proof is for',
    '',
    types.string,
  )
  .addParam(
    'proofstring',
    'a string representing the JSON object containing the opVault address and code proof of the code whitelist',
    '',
    types.string,
  )
  .setAction(async ({ limitorderdiamond, vault, proofstring }, hre) => {
    const ethers = hre.ethers;

    if (limitorderdiamond == '') {
      throw new Error('limit order diamond address required');
    }

    if (vault == '') {
      throw new Error('vault address required');
    }

    const proof = JSON.parse(proofstring);

    if (vault != proof.address) {
      throw new Error('vault does not match address that proof is for');
    }

    const instance = await ethers.getContractAt(
      'LimitOrderDiamond',
      ethers.utils.getAddress(limitorderdiamond),
    );

    const owner: SignerWithAddress = await ethers.getSigner(
      await instance.owner(),
    );
    const settings: ILimitOrder = await ethers.getContractAt(
      'ILimitOrder',
      ethers.utils.getAddress(limitorderdiamond),
    );

    console.log(`Setting the account proof for ${vault}...`);

    try {
      let tx = await settings
        .connect(owner)
        ['setCodeProof(bytes32[],address)'](
          proof.proof,
          ethers.utils.getAddress(vault),
        );

      await tx.wait();
    } catch (err) {
      console.log(
        `Failed to set the new code proof for ${vault} to ${proof.proof}!`,
      );
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the code proof for ${vault}`);
  });
