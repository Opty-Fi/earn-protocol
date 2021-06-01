// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { Modifiers } from "./Modifiers.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import { SafeMath } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IStrategyProvider } from "../../interfaces/opty/IStrategyProvider.sol";

/**
 * @dev Serves as an oracle service of opty-fi's earn protocol
 *      for best strategy
 */
contract StrategyProvider is IStrategyProvider, Modifiers {
    using SafeMath for uint256;

    mapping(string => mapping(bytes32 => bytes32)) public override rpToTokenToBestStrategy;
    mapping(string => mapping(bytes32 => bytes32)) public override rpToTokenToDefaultStrategy;
    mapping(bytes32 => DataTypes.VaultRewardStrategy) public vaultRewardTokenHashToVaultRewardTokenStrategy;
    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    DataTypes.DefaultStrategyState public defaultStrategyState;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {
        setDefaultStrategyState(DataTypes.DefaultStrategyState.CompoundOrAave);
    }

    /* solhint-disable no-empty-blocks */
    function setBestStrategy(
        string memory _riskProfile,
        bytes32 _tokenHash,
        bytes32 _strategyHash
    ) external override onlyOperator {
        DataTypes.RiskProfile memory _riskProfileStruct = registryContract.getRiskProfile(_riskProfile);
        require(_riskProfileStruct.exists, "!Rp_Exists");
        uint256 _index = registryContract.getTokensHashIndexByHash(_tokenHash);
        require(registryContract.getTokensHashByIndex(_index) == _tokenHash, "!TokenHashExists");
        rpToTokenToBestStrategy[_riskProfile][_tokenHash] = _strategyHash;
    }

    function setBestDefaultStrategy(
        string memory _riskProfile,
        bytes32 _tokenHash,
        bytes32 _strategyHash
    ) external override onlyOperator {
        DataTypes.RiskProfile memory _riskProfileStruct = registryContract.getRiskProfile(_riskProfile);
        require(_riskProfileStruct.exists, "!Rp_Exists");
        uint256 _index = registryContract.getTokensHashIndexByHash(_tokenHash);
        require(registryContract.getTokensHashByIndex(_index) == _tokenHash, "!TokenHashExists");
        rpToTokenToDefaultStrategy[_riskProfile][_tokenHash] = _strategyHash;
    }

    /**
     * @dev assign strategy in form of `_vaultRewardStrategy` to the `_vaultRewardTokenHash`.
     *
     * Returns a vaultRewardStrategy hash value indicating successful operation.
     *
     * Emits a {LogSetVaultRewardStrategy} event.
     *
     * Requirements:
     *
     * - msg.sender should be operator.
     * - `hold` in {_vaultRewardStrategy} shoould be greater than 0 and should be in `basis` format.
     *      For eg: If hold is 50%, then it's basis will be 5000, Similarly, if it 20%, then it's basis is 2000.
     * - `convert` in {_vaultRewardStrategy} should be approved
     *      For eg: If convert is 50%, then it's basis will be 5000, Similarly, if it 20%, then it's basis is 2000.
     */
    function setVaultRewardStrategy(
        bytes32 _vaultRewardTokenHash,
        DataTypes.VaultRewardStrategy memory _vaultRewardStrategy
    ) external override onlyOperator returns (DataTypes.VaultRewardStrategy memory) {
        require(_vaultRewardTokenHash != ZERO_BYTES32, "!bytes32(0)");
        uint256 _index = registryContract.getTokensHashIndexByHash(_vaultRewardTokenHash);
        require(registryContract.getTokensHashByIndex(_index) == _vaultRewardTokenHash, "!VaultRewardTokenHashExists");
        require(
            (_vaultRewardStrategy.hold.add(_vaultRewardStrategy.convert) == uint256(10000)) ||
                (_vaultRewardStrategy.hold.add(_vaultRewardStrategy.convert) == uint256(0)),
            "!HoldConvertBasisRange"
        );

        vaultRewardTokenHashToVaultRewardTokenStrategy[_vaultRewardTokenHash].hold = _vaultRewardStrategy.hold;
        vaultRewardTokenHashToVaultRewardTokenStrategy[_vaultRewardTokenHash].convert = _vaultRewardStrategy.convert;
        return vaultRewardTokenHashToVaultRewardTokenStrategy[_vaultRewardTokenHash];
    }

    function getDefaultStrategyState() external view override returns (DataTypes.DefaultStrategyState) {
        return defaultStrategyState;
    }

    function getVaultRewardTokenHashToVaultRewardTokenStrategy(bytes32 _tokensHash)
        external
        view
        override
        returns (DataTypes.VaultRewardStrategy memory)
    {
        return vaultRewardTokenHashToVaultRewardTokenStrategy[_tokensHash];
    }

    function setDefaultStrategyState(DataTypes.DefaultStrategyState _defaultStrategyState)
        public
        override
        onlyGovernance
    {
        defaultStrategyState = _defaultStrategyState;
    }
}
