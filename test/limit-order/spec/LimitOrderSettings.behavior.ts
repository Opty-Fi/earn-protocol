import { expect } from "chai";
import { ethers } from "hardhat";

export function describeBehaviorOfLimitOrderSettings(_skips?: string[]): void {
  describe(":LimitOrderSettings", () => {
    describe("#setTreasury(address)", () => {
      it("sets a new address for the treasury", async function () {
        const newTreasury = ethers.constants.AddressZero;

        await this.limitOrder.connect(this.signers.deployer).setTreasury(newTreasury);

        expect(await this.limitOrder.treasury()).to.eq(newTreasury);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          const newTreasury = ethers.constants.AddressZero;
          await expect(this.limitOrder.connect(this.signers.eve).setTreasury(newTreasury)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setVaultLiquidationFee(uint256,address)", () => {
      it("sets the fee for the given vault", async function () {
        const newFee = ethers.utils.parseEther("0.1");

        await this.limitOrder.connect(this.signers.deployer).setVaultLiquidationFee(newFee, this.opAAVEInvst.address);

        expect(await this.limitOrder.liquidationFee(this.opAAVEInvst.address)).to.eq(newFee);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          const newFee = ethers.utils.parseEther("0.1");
          await expect(
            this.limitOrder.connect(this.signers.eve).setVaultLiquidationFee(newFee, this.opAAVEInvst.address),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#setAccountProof(bytes32[])", async function () {
      it("sets the account proof", async function () {
        const newProof = [ethers.utils.formatBytes32String("0xNeWPro0Ff")];

        await this.limitOrder.connect(this.signers.deployer).setAccountProof(newProof, this.opAAVEInvst.address);

        expect(await this.limitOrder.accountProof(this.opAAVEInvst.address)).to.deep.eq(newProof);
      });
      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          const newProof = [ethers.utils.hexZeroPad("0x", 32)];
          await expect(
            this.limitOrder.connect(this.signers.eve).setAccountProof(newProof, this.opAAVEInvst.address),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#setOracle(address)", () => {
      it("sets the new oracle address", async function () {
        const newOracle = this.signers.deployer.address;

        await this.limitOrder.connect(this.signers.deployer).setOracle(newOracle);

        expect(await this.limitOrder.oracle()).to.eq(newOracle);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          const newOracle = this.signers.eve.address;
          await expect(this.limitOrder.connect(this.signers.eve).setOracle(newOracle)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#setVault(address)", () => {
      it("sets vault whitelist to true", async function () {
        await this.limitOrder.setVault(this.opAAVEInvst.address);

        expect(await this.limitOrder.vaultWhitelisted(this.opAAVEInvst.address)).to.eq(true);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(this.limitOrder.connect(this.signers.eve).setVault(this.opAAVEInvst.address)).to.be.revertedWith(
            "Ownable: sender must be owner",
          );
        });
      });
    });

    describe("#unsetVault(address)", () => {
      it("sets vault whitelist to false", async function () {
        await this.limitOrder.setVault(this.opAAVEInvst.address);
        await this.limitOrder.unsetVault(this.opAAVEInvst.address);
        expect(await this.limitOrder.vaultWhitelisted(this.opAAVEInvst.address)).to.eq(false);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).unsetVault(this.opAAVEInvst.address),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#setStablecoinVault(address)", () => {
      it("sets stable coin vault whitelist to true", async function () {
        await this.limitOrder.setStablecoinVault(this.opUSDCSave.address);

        expect(await this.limitOrder.stablecoinVaultWhitelisted(this.opUSDCSave.address)).to.eq(true);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).setStablecoinVault(this.opUSDCSave.address),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#unsetStablecoinVault(address)", () => {
      it("sets stablecoin vault whitelist to false", async function () {
        await this.limitOrder.setStablecoinVault(this.opUSDCSave.address);
        await this.limitOrder.unsetStablecoinVault(this.opUSDCSave.address);
        expect(await this.limitOrder.stablecoinVaultWhitelisted(this.opUSDCSave.address)).to.eq(false);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).unsetStablecoinVault(this.opUSDCSave.address),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#setVault(address[])", () => {
      it("set vaults whitelist to true", async function () {
        await this.limitOrder.setVaults([this.opAAVEInvst.address]);

        expect(await this.limitOrder.vaultWhitelisted(this.opAAVEInvst.address)).to.eq(true);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).setVaults([this.opAAVEInvst.address]),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#unsetVaults(address[])", () => {
      it("sets vaults whitelist to false", async function () {
        await this.limitOrder.setVaults([this.opAAVEInvst.address]);
        await this.limitOrder.unsetVaults([this.opAAVEInvst.address]);
        expect(await this.limitOrder.vaultWhitelisted(this.opAAVEInvst.address)).to.eq(false);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).unsetVaults([this.opAAVEInvst.address]),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#setStablecoinVault(address[])", () => {
      it("sets stable coin vault whitelist to true", async function () {
        await this.limitOrder.setStablecoinVaults([this.opUSDCSave.address]);

        expect(await this.limitOrder.stablecoinVaultWhitelisted(this.opUSDCSave.address)).to.eq(true);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).setStablecoinVaults([this.opUSDCSave.address]),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#unsetStablecoinVault(address[])", () => {
      it("sets stablecoin vault whitelist to false", async function () {
        await this.limitOrder.setStablecoinVaults([this.opUSDCSave.address]);
        await this.limitOrder.unsetStablecoinVaults([this.opUSDCSave.address]);
        expect(await this.limitOrder.stablecoinVaultWhitelisted(this.opUSDCSave.address)).to.eq(false);
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).unsetStablecoinVaults([this.opUSDCSave.address]),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#giveAllowances(address[],address[])", () => {
      it("sets allowances", async function () {
        await this.limitOrder.giveAllowances([this.aave.address], [this.uniV2Router.address]);

        expect(await this.aave.allowance(this.limitOrder.address, this.uniV2Router.address)).to.eq(
          ethers.constants.MaxUint256,
        );
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).giveAllowances([this.aave.address], [this.uniV2Router.address]),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#removeAllowances(address[],address[])", () => {
      it("remove allowances", async function () {
        await this.limitOrder.removeAllowances([this.aave.address], [this.uniV2Router.address]);

        expect(await this.aave.allowance(this.limitOrder.address, this.uniV2Router.address)).to.eq("0");
      });

      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).removeAllowances([this.aave.address], [this.uniV2Router.address]),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
    });

    describe("#transferOwnership(address)", () => {
      describe("reverts if", () => {
        it("called by nonOwner", async function () {
          await expect(
            this.limitOrder.connect(this.signers.eve).transferOwnership(this.signers.eve.address),
          ).to.be.revertedWith("Ownable: sender must be owner");
        });
      });
      it("owner can safely transfer ownership", async function () {
        await this.limitOrder.transferOwnership(this.signers.eve.address);

        await this.limitOrder.connect(this.signers.eve).acceptOwnership();

        expect(await this.limitOrder.owner()).to.eq(this.signers.eve.address);
      });
    });
  });
}
