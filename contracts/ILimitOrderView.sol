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
     * @notice returns price feed for a given token
     * @param _token address for the token
     * @return priceFeed address
     */
    function tokenPriceFeed(address _token)
        external
        view
        returns (address priceFeed);
}
