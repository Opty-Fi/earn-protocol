import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { task, types } from 'hardhat/config';
//@ts-ignore
import { ILimitOrder } from '../../typechain-types';

task(
  'setAccountProof',
  'sets the account merkle proof for a given opVault in LimitOrderDiamond contract',
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
    'proof',
    'the JSON object containing the address and account proof for that address',
    '',
    types.json,
  )
  .setAction(async ({ limitOrderDiamond, opVault, proof }, hre) => {
    const ethers = hre.ethers;
    if (opVault == '') {
      throw new Error('opVault address required');
    }

    if (opVault != proof.account) {
      throw new Error('opVault does not match account that proof is for');
    }

    const instance = await ethers.getContractAt(
      'LimitOrderDiamond',
      ethers.utils.getAddress(limitOrderDiamond),
    );

    const owner: SignerWithAddress = await ethers.getSigner(
      await instance.owner(),
    );
    const settings: ILimitOrder = await ethers.getContractAt(
      'ILimitOrder',
      ethers.utils.getAddress(limitOrderDiamond),
    );

    console.log(`Setting the account proof for ${opVault}...`);

    try {
      let tx = await settings
        .connect(owner)
        ['setAccountProof(bytes32[],address)'](
          proof.proof,
          ethers.utils.getAddress(opVault),
        );

      await tx.wait();
    } catch (err) {
      console.log(
        `Failed to set the new account proof for ${opVault} to ${proof.proof}!`,
      );
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the account proof for ${opVault}`);
  });
