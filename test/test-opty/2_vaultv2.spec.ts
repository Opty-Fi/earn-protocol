import hre from "hardhat";
import { Artifact } from "hardhat/types";
import {
  AdminUpgradeabilityProxy,
  InitializableImmutableAdminUpgradeabilityProxy,
  Vault,
  VaultV2,
} from "../../typechain";
import { opUSDCgrow } from "../../_deployments/mainnet.json";

const VAULT_DEPLOYED_NETWORK: string[] = ["1"];

describe("test VaultV2 with onchain upgrade", () => {
  before(async function () {
    // if chainId is included in VAULT_DEPLOYED_NETWORKS
    // then upgrade existing contract
    // or deploy new upgradeable vault contract
    const chainId = await hre.getChainId();
    const vaultV2Artifact: Artifact = await hre.artifacts.readArtifact("VaultV2");
    if (VAULT_DEPLOYED_NETWORK.includes(chainId)) {
      this.vaultProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
        await hre.ethers.getContractAt("VaultProxy", opUSDCgrow.VaultProxy)
      );
      this.vault = <Vault>await hre.ethers.getContractAt("Vault", opUSDCgrow.Vault);
      this.vaultV2 = <VaultV2>await hre.waffle.deployContract(this.signers.deployer, vaultV2Artifact, []);
      await this.vaultProxy.connect(this.signers.admin).upgradeTo(this.vaultV2.address);
    } else {
      const vaultProxyV2Artifact: Artifact = await hre.artifacts.readArtifact("VaultProxyV2");
      this.vaultProxyV2 = <AdminUpgradeabilityProxy>(
        await hre.waffle.deployContract(this.signers.deployer, vaultProxyV2Artifact, [])
      );
      this.vaultV2 = <VaultV2>await hre.waffle.deployContract(this.signers.deployer, vaultV2Artifact, []);
    }
  });
  describe("VaultV2 Configuration", () => {
    before(async function () {});
    it("fn1", async function () {});
    it("fn2", async function () {});
  });

  describe("VaultV2 strategies", () => {
    before(async function () {});
    for (let i = 0; i < 10; i++) {
      it(`strategy${i}`, async function () {});
    }
  });
});
