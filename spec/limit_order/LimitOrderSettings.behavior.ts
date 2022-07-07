import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import hre from 'hardhat';
import { ILimitOrder } from '../../typechain-types';

export function describeBehaviorOfLimitOrderSettings(
  deploy: () => Promise<ILimitOrder>,
  skips?: string[],
) {
  const ethers = hre.ethers;

  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let instance: ILimitOrder;

  const AaveVaultProxy = '0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19';

  before(async () => {
    [owner, nonOwner] = await ethers.getSigners();
  });

  beforeEach(async () => {
    instance = await deploy();
  });

  describe(':LimitOrderSettings', () => {
    describe('#setTreasury(address)', () => {
      it('sets a new address for the treasury', async () => {
        const newTreasury = ethers.constants.AddressZero;

        await instance.connect(owner).setTreasury(newTreasury);

        expect(await instance.treasury()).to.eq(newTreasury);
      });

      describe('reverts if', () => {
        it('called by nonOwner', async () => {
          const newTreasury = ethers.constants.AddressZero;
          await expect(
            instance.connect(nonOwner).setTreasury(newTreasury),
          ).to.be.revertedWith('Ownable: sender must be owner');
        });
      });
    });

    describe('#setVaultLiquidationFee(uint256,address)', () => {
      it('sets the fee for the given vault', async () => {
        const newFee = ethers.utils.parseEther('0.1');

        await instance
          .connect(owner)
          .setVaultLiquidationFee(newFee, AaveVaultProxy);

        expect(await instance.vaultFee(AaveVaultProxy)).to.eq(newFee);
      });

      describe('reverts if', () => {
        it('called by nonOwner', async () => {
          const newFee = ethers.utils.parseEther('0.1');
          await expect(
            instance
              .connect(nonOwner)
              .setVaultLiquidationFee(newFee, AaveVaultProxy),
          ).to.be.revertedWith('Ownable: sender must be owner');
        });
      });
    });

    describe('#setProof(bytes32[])', async () => {
      it('sets the proof', async () => {
        const newProof = [ethers.utils.formatBytes32String('0xNeWPro0Ff')];

        await instance.connect(owner).setProof(newProof);

        expect(await instance.proof()).to.deep.eq(newProof);
      });
      describe('reverts if', () => {
        it('called by nonOwner', async () => {
          const newProof = [ethers.utils.hexZeroPad('0x', 32)];
          await expect(
            instance.connect(nonOwner).setProof(newProof),
          ).to.be.revertedWith('Ownable: sender must be owner');
        });
      });
    });

    describe('#setSwapDiamond(address)', () => {
      it('sets the new swapDiamond address', async () => {
        const newSwapDiamond = owner.address;
        await instance.connect(owner).setSwapDiamond(newSwapDiamond);
        expect(await instance.swapDiamond()).to.eq(newSwapDiamond);
      });

      describe('reverts if', () => {
        it('called by nonOwner', async () => {
          const newSwapDiamond = nonOwner.address;
          await expect(
            instance.connect(nonOwner).setSwapDiamond(newSwapDiamond),
          ).to.be.revertedWith('Ownable: sender must be owner');
        });
      });
    });

    describe('#setOracle(address)', () => {
      it('sets the new oracle address', async () => {
        const newOracle = owner.address;

        await instance.connect(owner).setOracle(newOracle);

        expect(await instance.oracle()).to.eq(newOracle);
      });

      describe('reverts if', () => {
        it('called by nonOwner', async () => {
          const newOracle = nonOwner.address;
          await expect(
            instance.connect(nonOwner).setOracle(newOracle),
          ).to.be.revertedWith('Ownable: sender must be owner');
        });
      });
    });
  });
}
