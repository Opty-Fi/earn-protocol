import { task, types } from "hardhat/config";
import { deployVault } from "../../helpers/contracts-deployments";
import { getTokenInforWithAddress, unpauseVault } from "../../helpers/contracts-actions";
import { insertContractIntoDB } from "../../helpers/db";
import { isAddress, getContractInstance } from "../../helpers/helpers";
import { RISK_PROFILES, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
task("deploy-vault", "Deploy Vault")
  .addParam("token", "the address of underlying token", "", types.string)
  .addParam("riskprofile", "the address of underlying token", "", types.string)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("unpause", "unpause vault", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ token, riskprofile, registry, insertindb, unpause }, hre) => {
    const [owner, admin] = await hre.ethers.getSigners();

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    if (riskprofile === "") {
      throw new Error("riskProfile cannot be empty");
    }

    if (!Object.keys(RISK_PROFILES).includes(riskprofile)) {
      throw new Error("riskProfile is invalid");
    }

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    const { name, symbol } = await getTokenInforWithAddress(hre, token);

    const vault = await deployVault(hre, registry, token, owner, admin, name, symbol, riskprofile, false);

    console.log(`Contract ${symbol}-${riskprofile}: ${vault.address}`);

    const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);

    if (unpause) {
      await unpauseVault(owner, registryContract, vault.address, true);
    }

    if (insertindb) {
      const err = await insertContractIntoDB(`${symbol}-${riskprofile}`, vault.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
