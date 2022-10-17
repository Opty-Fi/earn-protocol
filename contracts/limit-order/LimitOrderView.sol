// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "./DataTypes.sol";
import { ILimitOrderView } from "../interfaces/limit-order/ILimitOrderView.sol";
import { ILimitOrderActions } from "../interfaces/limit-order/ILimitOrderActions.sol";
import { LimitOrderSettings } from "./LimitOrderSettings.sol";
import { LimitOrderStorage } from "./LimitOrderStorage.sol";
import { IVault } from "../interfaces/limit-order/IVault.sol";
import { IERC20 } from "@solidstate/contracts/token/ERC20/IERC20.sol";

/**
 * @title LimitOrderView
 * @author OptyFi
 * @dev contains all viewing actions
 */
abstract contract LimitOrderView is LimitOrderSettings, ILimitOrderView {
    /**
     * @inheritdoc ILimitOrderView
     */
    function userVaultOrder(address _user, address _vault) external view returns (DataTypes.Order memory) {
        return _userVaultOrder(LimitOrderStorage.layout(), _user, _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function userVaultOrderActive(address _user, address _vault) external view returns (bool) {
        return _userVaultOrderActive(LimitOrderStorage.layout(), _user, _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function liquidationFee(address _vault) external view returns (uint256) {
        return _vaultLiquidationFee(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function treasury() external view returns (address) {
        return _treasury(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function accountProof(address _vault) external view returns (bytes32[] memory) {
        return _accountProof(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function oracle() external view returns (address) {
        return _oracle(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function ops() external view returns (address) {
        return _ops(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function canExecuteOrder(address _maker, address _vault) external view returns (bool, bytes memory) {
        return _canExecuteOrder(_maker, _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function stablecoinVaultWhitelisted(address _vault) external view returns (bool) {
        return _stablecoinVaultWhitelisted(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function vaultWhitelisted(address _vault) external view returns (bool) {
        return _vaultWhitelisted(LimitOrderStorage.layout(), _vault);
    }
}
