import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { ILimitOrder } from "../../typechain-types";

export function describeBehaviorOfLimitOrderSettings(deploy: () => Promise<ILimitOrder>, skips?: string[]) {
  const ethers = hre.ethers;

  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let instance: ILimitOrder;

  const AaveVaultProxy = "0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19";
  const UsdcVaultProxy = "0x6d8BfdB4c4975bB086fC9027e48D5775f609fF88";

  before(async () => {
    [owner, nonOwner] = await ethers.getSigners();
  });

  beforeEach(async () => {
    instance = await deploy();
  });

  describe(":LimitOrderSettings", () => {
    describe("#setTreasury(address)", () => {
      it("sets a new address for the treasury", async () => {
        const newTreasury = ethers.constants.AddressZero;

        await instance.connect(owner).setTreasury(newTreasury);

        expect(await instance.treasury()).to.eq(newTreasury);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          const newTreasury = ethers.constants.AddressZero;
          await expect(instance.connect(nonOwner).setTreasury(newTreasury)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setVaultLiquidationFee(uint256,address)", () => {
      it("sets the fee for the given vault", async () => {
        const newFee = ethers.utils.parseEther("0.1");

        await instance.connect(owner).setVaultLiquidationFee(newFee, AaveVaultProxy);

        expect(await instance.vaultFee(AaveVaultProxy)).to.eq(newFee);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          const newFee = ethers.utils.parseEther("0.1");
          await expect(instance.connect(nonOwner).setVaultLiquidationFee(newFee, AaveVaultProxy)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setCodeProof(bytes32[])", async () => {
      it("sets the code proof", async () => {
        const newProof = [ethers.utils.formatBytes32String("0xNeWPro0Ff")];

        await instance.connect(owner).setCodeProof(newProof, AaveVaultProxy);

        expect(await instance.codeProof(AaveVaultProxy)).to.deep.eq(newProof);
      });
      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          const newProof = [ethers.utils.hexZeroPad("0x", 32)];
          await expect(instance.connect(nonOwner).setCodeProof(newProof, AaveVaultProxy)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setAccountProof(bytes32[])", async () => {
      it("sets the account proof", async () => {
        const newProof = [ethers.utils.formatBytes32String("0xNeWPro0Ff")];

        await instance.connect(owner).setAccountProof(newProof, AaveVaultProxy);

        expect(await instance.accountProof(AaveVaultProxy)).to.deep.eq(newProof);
      });
      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          const newProof = [ethers.utils.hexZeroPad("0x", 32)];
          await expect(instance.connect(nonOwner).setAccountProof(newProof, AaveVaultProxy)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setSwapDiamond(address)", () => {
      it("sets the new swapDiamond address", async () => {
        const newSwapDiamond = owner.address;
        await instance.connect(owner).setSwapDiamond(newSwapDiamond);
        expect(await instance.swapDiamond()).to.eq(newSwapDiamond);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          const newSwapDiamond = nonOwner.address;
          await expect(instance.connect(nonOwner).setSwapDiamond(newSwapDiamond)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setOracle(address)", () => {
      it("sets the new oracle address", async () => {
        const newOracle = owner.address;

        await instance.connect(owner).setOracle(newOracle);

        expect(await instance.oracle()).to.eq(newOracle);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          const newOracle = nonOwner.address;
          await expect(instance.connect(nonOwner).setOracle(newOracle)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setVault(address)", () => {
      it("sets vault whitelist to true", async () => {
        await instance.setVault(AaveVaultProxy);

        expect(await instance.vaultWhitelisted(AaveVaultProxy)).to.eq(true);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          await expect(instance.connect(nonOwner).setVault(AaveVaultProxy)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#unsetVault(address)", () => {
      it("sets vault whitelist to false", async () => {
        await instance.setVault(AaveVaultProxy);
        await instance.unsetVault(AaveVaultProxy);
        expect(await instance.vaultWhitelisted(AaveVaultProxy)).to.eq(false);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async () => {
          await expect(instance.connect(nonOwner).unsetVault(AaveVaultProxy)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });
  });
}
