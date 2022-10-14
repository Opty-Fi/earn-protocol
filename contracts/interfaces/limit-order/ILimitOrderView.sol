// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "../../limit-order/DataTypes.sol";

/**
 * @title Interface for LimitOrderView facet
 * @author OptyFi
 */
interface ILimitOrderView {
    /**
     * @notice returns a users active limit order for a target vault
     * @param _user address of user
     * @param _vault address of vault
     * @return order the active limit order
     */
    function userVaultOrder(address _user, address _vault) external view returns (DataTypes.Order memory order);

    /**
     * @notice returns a boolean indicating whether a user has an active limit order on a vault
     * @param _user address of user
     * @param _vault address of vault
     * @return hasActiveOrder boolean indicating whether user has an active order
     */
    function userVaultOrderActive(address _user, address _vault) external view returns (bool hasActiveOrder);

    /**
     * @notice returns the liquidation fee for a given vault
     * @param _vault address of the vault
     * @return fee in basis points
     */
    function liquidationFee(address _vault) external view returns (uint256 fee);

    /**
     * @notice returns address of the treasury
     * @return treasury address
     */
    function treasury() external view returns (address treasury);

    /**
     * @notice returns LimitOrderDiamond account merkle proof
     * @dev required for deposits/withdrawals in OptyFi Vaults
     * @return proof LimitOrder account merkle proof
     * @param _vault address of OptyFi vault to get accountProof for
     */
    function accountProof(address _vault) external view returns (bytes32[] memory proof);

    /**
     * @notice returns address of the OptyFi Oracle
     * @return oracle address
     */
    function oracle() external view returns (address oracle);

    /**
     * @notice returns address of limit order operation contract address
     * @return ops address
     */
    function ops() external view returns (address ops);

    /**
     * @notice resolver function for automation relayer
     * @param _maker address of limit order creator
     * @param _vault address of the vault
     * @return canExec whether Ops should execute the task
     * @return execPayload data that executors should use for the execution
     */
    function canExecuteOrder(address _maker, address _vault)
        external
        view
        returns (bool canExec, bytes memory execPayload);

    /**
     * @notice returns the whitelisted state of a stablecoin vault
     * @param _vault address of stablecoin vault
     */
    function stablecoinVaultWhitelisted(address _vault) external view returns (bool);

    /**
     * @notice returns the whitelisted state of a non-stablecoin vault
     * @param _vault address of non-stablecoin vault
     */
    function vaultWhitelisted(address _vault) external view returns (bool);
}
