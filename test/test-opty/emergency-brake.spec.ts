import hre, { deployments, ethers } from "hardhat";
import chai, { expect } from "chai";
import { BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { getAccountsMerkleProof, getAccountsMerkleRoot, Signers } from "../../helpers/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { ERC20, ERC20__factory, Registry, Registry__factory, Vault, Vault__factory } from "../../typechain";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

describe("Vault Protection", function () {
  before(async function () {
    const MAX_AMOUNT = BigNumber.from(1000000000000);
    await deployments.fixture();
    const OPUSDCEARN_VAULT_ADDRESS = (await deployments.get("opUSDCearn")).address;
    const REGISTRY_PROXY_ADDRESS = (await deployments.get("RegistryProxy")).address;
    this.vault = <Vault>await ethers.getContractAt(Vault__factory.abi, OPUSDCEARN_VAULT_ADDRESS);
    this.registry = <Registry>await ethers.getContractAt(Registry__factory.abi, REGISTRY_PROXY_ADDRESS);
    this.vaultToken = <ERC20>await ethers.getContractAt(ERC20__factory.abi, OPUSDCEARN_VAULT_ADDRESS);
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.owner = signers[0];
    const governanceAddress = await this.registry.getGovernance();
    this.signers.governance = await ethers.getSigner(governanceAddress);
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);

    // (0-15) Deposit fee UT = 0 USDC = 0000
    // (16-31) Deposit fee % = 0% = 0000
    // (32-47) Withdrawal fee UT = 0 USDC = 0000
    // (48-63) Withdrawal fee % = 0% = 0000
    // (64-79) Max vault value jump % = 1.00% = 0064
    // (80-239) vault fee address = 0x0000000000000000000000000000000000000000
    // (240-247) risk profile code = 1 = 01
    // (248) emergency shutdown = true = 0
    // (249) unpause = true = 1
    // (250) allow whitelisted state = true = 0
    // (251) - 0
    // (252) - 0
    // (253) - 0
    // (254) - 0
    // (255) - 0
    // 0x0201000000000000000000000000000000000000000000640000000000000000
    const _vaultConfiguration = BigNumber.from(
      "906392544231311161076231617881117198619499239097192527361058388634069106688",
    );
    await this.vault.connect(this.signers.governance).setVaultConfiguration(_vaultConfiguration);
    await this.vault.connect(this.signers.financeOperator).setValueControlParams(
      "10000000000", // 10,000 USDC
      "1000000000", // 1000 USDC
      "1000000000000", // 1,000,000 USDC
    );
    const UserContractFactory = await hre.ethers.getContractFactory(TESTING_CONTRACTS.TESTING_EMERGENCY_BRAKE);
    this.userContract = await UserContractFactory.deploy(
      OPUSDCEARN_VAULT_ADDRESS,
      MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
    );

    const timestamp = (await getBlockTimestamp(hre)) * 2;
    await fundWalletToken(hre, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address, this.signers.owner, MAX_AMOUNT, timestamp);

    this.ERC20Instance = await hre.ethers.getContractAt(
      ESSENTIAL_CONTRACTS.ERC20,
      MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
    );
    await this.ERC20Instance.connect(this.signers.owner).transfer(this.userContract.address, MAX_AMOUNT);

    const _accountsRoot = getAccountsMerkleRoot([this.signers.owner.address, this.userContract.address]);
    await this.vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountsRoot);
    this.accountProof = getAccountsMerkleProof(
      [this.signers.owner.address, this.userContract.address],
      this.userContract.address,
    );
  });

  describe("Vault Deposit Protection", () => {
    const tokenAmount = BigNumber.from("2000000000");

    it("User should be able to deposit to the vault", async function () {
      const balanceBefore = await this.vault.balanceOf(this.userContract.address);
      await this.userContract.connect(this.signers.owner).runUserDepositVault(tokenAmount, "0x", this.accountProof);
      const balanceAfter = await this.vault.balanceOf(this.userContract.address);
      expect(balanceAfter).eq(balanceBefore.add(tokenAmount));
    });

    it("User should be able to deposit and transfer in the same block", async function () {
      const balanceContractBefore = await this.vault.balanceOf(this.userContract.address);
      const balanceUserBefore = await this.vault.balanceOf(this.signers.owner.address);
      await this.userContract
        .connect(this.signers.owner)
        .runTwoTxnDepositAndTransfer(tokenAmount, "0x", this.accountProof);
      const balanceContractAfter = await this.vault.balanceOf(this.userContract.address);
      const balanceUserAfter = await this.vault.balanceOf(this.signers.owner.address);
      expect(balanceContractAfter).eq(balanceContractBefore);
      expect(balanceUserAfter).eq(balanceUserBefore.add(tokenAmount));
    });

    it("User should be able to withdraw from the vault", async function () {
      const balanceBefore = await this.vault.balanceOf(this.userContract.address);
      await this.userContract.connect(this.signers.owner).runUserWithdrawVault(tokenAmount.div(2), this.accountProof);
      const balanceAfter = await this.vault.balanceOf(this.userContract.address);
      expect(balanceAfter).eq(balanceBefore.sub(tokenAmount.div(2)));
    });

    it("User should be able to deposit to the vault twice in the same block", async function () {
      const balanceBefore = await this.vault.balanceOf(this.userContract.address);
      await this.userContract
        .connect(this.signers.owner)
        .runTwoTxnUserDepositVault(tokenAmount, "0x", this.accountProof);
      const balanceAfter = await this.vault.balanceOf(this.userContract.address);
      expect(balanceAfter).eq(balanceBefore.add(tokenAmount.mul(2)));
    });

    it("User should be able to withdraw from the vault twice in the same block, EMERGENCY_BRAKE", async function () {
      const balanceBefore = await this.vault.balanceOf(this.userContract.address);
      await this.userContract
        .connect(this.signers.owner)
        .runTwoTxnUserWithdrawVault(tokenAmount.div(2), this.accountProof);
      const balanceAfter = await this.vault.balanceOf(this.userContract.address);
      expect(balanceAfter).eq(balanceBefore.sub(tokenAmount));
    });

    it("User should NOT be able to deposit and withdraw in the same block, EMERGENCY_BRAKE", async function () {
      await expect(
        this.userContract.connect(this.signers.owner).runTwoTxnDepositAndWithdraw(tokenAmount, "0x", this.accountProof),
      ).to.be.revertedWith("16");
    });
  });
});
