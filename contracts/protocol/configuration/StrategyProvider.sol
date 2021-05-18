// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { Modifiers } from "./Modifiers.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import { SafeMath } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @dev Serves as an oracle service of opty-fi's earn protocol
 *      for best strategy
 */
contract StrategyProvider is Modifiers {
    using SafeMath for uint256;

    mapping(string => mapping(bytes32 => bytes32)) public rpToTokenToBestStrategy;
    mapping(string => mapping(bytes32 => bytes32)) public rpToTokenToDefaultStrategy;
    mapping(bytes32 => DataTypes.VaultRewardStrategy) public vaultRewardTokenHashToVaultRewardTokenStrategy;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /* solhint-disable no-empty-blocks */
    function setBestStrategy(
        string memory _riskProfile,
        bytes32 _tokenHash,
        bytes32 _strategyHash
    ) public onlyOperator {
        (, , , , bool _profileExists) = registryContract.riskProfiles(_riskProfile);
        require(_profileExists, "!Rp_Exists");
        uint256 _index = registryContract.tokensHashToTokens(_tokenHash);
        require(registryContract.tokensHashIndexes(_index) == _tokenHash, "!TokenHashExists");
        rpToTokenToBestStrategy[_riskProfile][_tokenHash] = _strategyHash;
    }

    function setBestDefaultStrategy(
        string memory _riskProfile,
        bytes32 _tokenHash,
        bytes32 _strategyHash
    ) public onlyOperator {
        (, , , , bool _profileExists) = registryContract.riskProfiles(_riskProfile);
        require(_profileExists, "!Rp_Exists");
        uint256 _index = registryContract.tokensHashToTokens(_tokenHash);
        require(registryContract.tokensHashIndexes(_index) == _tokenHash, "!TokenHashExists");
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
    ) public onlyOperator returns (DataTypes.VaultRewardStrategy memory) {
        require(
            _vaultRewardTokenHash != 0x0000000000000000000000000000000000000000000000000000000000000000,
            "!bytes32(0)"
        );
        uint256 _index = registryContract.tokensHashToTokens(_vaultRewardTokenHash);
        require(registryContract.tokensHashIndexes(_index) == _vaultRewardTokenHash, "!VaultRewardTokenHashExists");
        require(
            (_vaultRewardStrategy.hold.add(_vaultRewardStrategy.convert) == uint256(10000)) ||
                (_vaultRewardStrategy.hold.add(_vaultRewardStrategy.convert) == uint256(0)),
            "!HoldConvertBasisRange"
        );

        vaultRewardTokenHashToVaultRewardTokenStrategy[_vaultRewardTokenHash].hold = _vaultRewardStrategy.hold;
        vaultRewardTokenHashToVaultRewardTokenStrategy[_vaultRewardTokenHash].convert = _vaultRewardStrategy.convert;
        return vaultRewardTokenHashToVaultRewardTokenStrategy[_vaultRewardTokenHash];
    }
}
