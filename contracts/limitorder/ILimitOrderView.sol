// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';

interface ILimitOrderView {
    /**
     * @notice returns a users active limit order for a target vault
     * @param _user address of user
     * @param _vault address of vault
     * @return order the active limit order
     */
    function userVaultOrder(address _user, address _vault)
        external
        view
        returns (DataTypes.Order memory order);

    /**
     * @notice returns a boolean indicating whether a user has an active limit order on a vault
     * @param _user address of user
     * @param _vault address of vault
     * @return hasActiveOrder boolean indicating whether user has an active order
     */
    function userVaultOrderActive(address _user, address _vault)
        external
        view
        returns (bool hasActiveOrder);

    /**
     * @notice returns the liquidation fee for a given vault
     * @param _vault address of the vault
     * @return fee in basis points
     */
    function vaultFee(address _vault) external view returns (uint256 fee);

    /**
     * @notice returns address of the treasury
     * @return treasury address
     */
    function treasury() external view returns (address treasury);

    /**
     * @notice returns LimitOrderDiamond merkle proof
     * @return proof LimitOrder merkle proof
     */
    function proof() external view returns (bytes32[] memory proof);

    /**
     * @notice returns address of the OptyFiSwapper diamond
     * @return swapDiamond address
     */
    function swapDiamond() external view returns (address swapDiamond);

    /**
     * @notice returns address of the OptyFi Oracle
     * @return oracle address
     */
    function oracle() external view returns (address oracle);

    /**
     * @notice returns address of the TokenTransferProxy
     * @return transferProxy address
     */
    function transferProxy() external view returns (address transferProxy);
}
